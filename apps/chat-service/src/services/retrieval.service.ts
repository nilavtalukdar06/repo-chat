import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { rerankModel } from "@/lib/gateway";
import { embeddingModel } from "@/lib/openai";
import { qdrant } from "@/lib/qdrant";
import { embed, rerank } from "ai";

const SEARCH_LIMIT = 20;
const LEXICAL_CANDIDATES = 100;
const MAX_LEXICAL_TERMS = 8;
const RERANK_TOP_N = 8;
const RERANK_MIN_SCORE = 0.1;
const RRF_K = 60;
const BM25_K1 = 1.2;
const BM25_B = 0.75;
const EMBED_TIMEOUT_MS = 15_000;
const RERANK_TIMEOUT_MS = 10_000;
const CONTENT_FIELD = "content";

const STOPWORDS = new Set(
  "a an and are as at be but by can could did do does for from has have how i if in into is it its me my of on or our should so than that the their them then there these this those to was we were what when where which who why will with would you your about any all also code file files function functions method repo repository show tell explain work works used use using get set make please".split(
    " ",
  ),
);

export interface SearchScope {
  repositoryId: string;
  userId: string;
}

export interface RetrievedChunk {
  id: string;
  filePath: string;
  language: string;
  startLine: number;
  endLine: number;
  content: string;
  score: number;
}

interface ChunkPayload {
  filePath: string;
  language: string;
  startLine: number;
  endLine: number;
  content: string;
}

function scopeFilter({ repositoryId, userId }: SearchScope) {
  return [
    { key: "repositoryId", match: { value: repositoryId } },
    { key: "userId", match: { value: userId } },
  ];
}

function toChunk(
  point: { id: string | number; payload?: Record<string, unknown> | null },
  score: number,
): RetrievedChunk | null {
  const payload = point.payload as unknown as ChunkPayload | undefined;
  if (!payload?.content || !payload.filePath) return null;
  return {
    id: String(point.id),
    filePath: payload.filePath,
    language: payload.language,
    startLine: payload.startLine,
    endLine: payload.endLine,
    content: payload.content,
    score,
  };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter(Boolean);
}

export function extractTerms(query: string): string[] {
  const words = query.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
  const terms = new Map<string, number>();
  for (const word of words) {
    const term = word.toLowerCase();
    if (term.length < 3 || STOPWORDS.has(term)) continue;
    const isIdentifier = /[a-z][A-Z]|_|\d/.test(word);
    terms.set(term, Math.max(terms.get(term) ?? 0, isIdentifier ? 2 : 1));
  }
  return [...terms.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, MAX_LEXICAL_TERMS)
    .map(([term]) => term);
}

function bm25(candidates: RetrievedChunk[], terms: string[]): RetrievedChunk[] {
  const documents = candidates.map((chunk) => tokenize(chunk.content));
  const averageLength =
    documents.reduce((sum, tokens) => sum + tokens.length, 0) /
    Math.max(documents.length, 1);
  const documentFrequency = new Map(
    terms.map((term) => [
      term,
      documents.filter((tokens) => tokens.includes(term)).length,
    ]),
  );

  return candidates
    .map((chunk, index) => {
      const tokens = documents[index]!;
      let score = 0;
      for (const term of terms) {
        const frequency = tokens.filter((token) => token === term).length;
        if (frequency === 0) continue;
        const df = documentFrequency.get(term)!;
        const idf = Math.log(1 + (candidates.length - df + 0.5) / (df + 0.5));
        score +=
          (idf * frequency * (BM25_K1 + 1)) /
          (frequency +
            BM25_K1 * (1 - BM25_B + (BM25_B * tokens.length) / averageLength));
      }
      return { ...chunk, score };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score);
}

function fuse(lists: RetrievedChunk[][]): RetrievedChunk[] {
  const fused = new Map<string, RetrievedChunk>();
  for (const list of lists) {
    list.forEach((chunk, rank) => {
      const score = 1 / (RRF_K + rank + 1);
      const existing = fused.get(chunk.id);
      fused.set(chunk.id, {
        ...chunk,
        score: (existing?.score ?? 0) + score,
      });
    });
  }
  return [...fused.values()].sort((a, b) => b.score - a.score);
}

export abstract class RetrievalService {
  static async dense(
    text: string,
    scope: SearchScope,
  ): Promise<RetrievedChunk[]> {
    const { embedding } = await embed({
      model: embeddingModel,
      value: text,
      abortSignal: AbortSignal.timeout(EMBED_TIMEOUT_MS),
    });
    const { points } = await qdrant.query(env.QDRANT_COLLECTION, {
      query: embedding,
      filter: { must: scopeFilter(scope) },
      limit: SEARCH_LIMIT,
      with_payload: true,
    });
    return points.flatMap((point) => toChunk(point, point.score) ?? []);
  }

  static async lexical(
    query: string,
    scope: SearchScope,
  ): Promise<RetrievedChunk[]> {
    const terms = extractTerms(query);
    if (terms.length === 0) return [];
    const { points } = await qdrant.scroll(env.QDRANT_COLLECTION, {
      filter: {
        must: scopeFilter(scope),
        should: terms.map((term) => ({
          key: CONTENT_FIELD,
          match: { text: term },
        })),
      },
      limit: LEXICAL_CANDIDATES,
      with_payload: true,
      with_vector: false,
    });
    const candidates = points.flatMap((point) => toChunk(point, 0) ?? []);
    return bm25(candidates, terms).slice(0, SEARCH_LIMIT);
  }

  static async search(input: {
    denseText: string;
    lexicalText: string;
    scope: SearchScope;
  }): Promise<RetrievedChunk[][]> {
    const results = await Promise.allSettled([
      RetrievalService.dense(input.denseText, input.scope),
      RetrievalService.lexical(input.lexicalText, input.scope),
    ]);
    const failures = results.flatMap((result) =>
      result.status === "rejected" ? [result.reason] : [],
    );
    for (const error of failures) {
      logger.warn({ error }, "retrieval search failed");
    }
    if (failures.length === results.length) throw failures[0];
    return results.map((result) =>
      result.status === "fulfilled" ? result.value : [],
    );
  }

  static dedupe(lists: RetrievedChunk[][]): RetrievedChunk[] {
    const unique = new Map<string, RetrievedChunk>();
    for (const chunk of lists.flat()) {
      if (!unique.has(chunk.id)) unique.set(chunk.id, chunk);
    }
    return [...unique.values()];
  }

  static async rerank(
    query: string,
    lists: RetrievedChunk[][],
  ): Promise<RetrievedChunk[]> {
    const candidates = RetrievalService.dedupe(lists);
    if (candidates.length === 0) return [];
    try {
      const { ranking } = await rerank({
        model: rerankModel,
        query,
        documents: candidates.map(
          (chunk) =>
            `${chunk.filePath}:${chunk.startLine}-${chunk.endLine}\n\n${chunk.content}`,
        ),
        topN: RERANK_TOP_N,
        maxRetries: 1,
        abortSignal: AbortSignal.timeout(RERANK_TIMEOUT_MS),
      });
      return ranking
        .filter(({ score }) => score >= RERANK_MIN_SCORE)
        .map(({ originalIndex, score }) => ({
          ...candidates[originalIndex]!,
          score,
        }));
    } catch (error) {
      logger.warn({ error }, "rerank failed, falling back to rank fusion");
      return fuse(lists).slice(0, RERANK_TOP_N);
    }
  }

  static async ensureTextIndex(): Promise<void> {
    try {
      const { exists } = await qdrant.collectionExists(env.QDRANT_COLLECTION);
      if (!exists) {
        logger.warn(
          `qdrant collection ${env.QDRANT_COLLECTION} does not exist yet, skipping text index`,
        );
        return;
      }
      const { payload_schema } = await qdrant.getCollection(
        env.QDRANT_COLLECTION,
      );
      if (payload_schema[CONTENT_FIELD]) return;
      await qdrant.createPayloadIndex(env.QDRANT_COLLECTION, {
        field_name: CONTENT_FIELD,
        field_schema: {
          type: "text",
          tokenizer: "word",
          lowercase: true,
          min_token_len: 2,
          max_token_len: 40,
        },
        wait: false,
      });
      logger.info(`creating text index on ${env.QDRANT_COLLECTION}.content`);
    } catch (error) {
      logger.error({ error }, "failed to ensure qdrant text index");
    }
  }
}
