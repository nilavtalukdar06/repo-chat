import { createHash } from "node:crypto";
import { createOpenAI } from "@ai-sdk/openai";
import { embedMany } from "ai";
import batch from "it-batch";
import { v5 as uuidv5 } from "uuid";
import { env } from "@/config/env";
import type { CodeChunk } from "@/indexer/chunk";

const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });

const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;
const BATCH_SIZE = 64;

const POINT_ID_NAMESPACE = "b3f1c0de-5a7e-4c1d-9e2a-7d4f6a1b8c90";

export interface IndexScope {
  repositoryId: string;
  userId: string;
}

export interface ChunkPayload extends IndexScope {
  filePath: string;
  language: string;
  chunkIndex: number;
  startLine: number;
  endLine: number;
  content: string;
  contentHash: string;
}

export interface EmbeddedChunk {
  id: string;
  vector: number[];
  payload: ChunkPayload;
}

export function pointId(
  repositoryId: string,
  filePath: string,
  chunkIndex: number,
): string {
  return uuidv5(
    `${repositoryId}:${filePath}:${chunkIndex}`,
    POINT_ID_NAMESPACE,
  );
}

function toEmbeddingText(chunk: CodeChunk): string {
  return `File: ${chunk.filePath}\nLanguage: ${chunk.language}\n\n${chunk.content}`;
}

export async function embedChunks(
  chunks: CodeChunk[],
  scope: IndexScope,
): Promise<EmbeddedChunk[]> {
  if (chunks.length === 0) return [];
  const { embeddings } = await embedMany({
    model: openai.embedding(EMBEDDING_MODEL),
    values: chunks.map(toEmbeddingText),
    maxParallelCalls: 2,
    maxRetries: 4,
    abortSignal: AbortSignal.timeout(120_000),
  });
  if (embeddings.length !== chunks.length) {
    throw new Error(
      `expected ${chunks.length} embeddings but received ${embeddings.length}`,
    );
  }
  return chunks.map((chunk, i) => {
    const vector = embeddings[i]!;
    if (vector.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `expected ${EMBEDDING_DIMENSIONS} dimensions but ${EMBEDDING_MODEL} returned ${vector.length}`,
      );
    }
    return {
      id: pointId(scope.repositoryId, chunk.filePath, chunk.chunkIndex),
      vector,
      payload: {
        ...scope,
        filePath: chunk.filePath,
        language: chunk.language,
        chunkIndex: chunk.chunkIndex,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        content: chunk.content,
        contentHash: createHash("sha256").update(chunk.content).digest("hex"),
      },
    };
  });
}

export async function* embedChunkStream(
  source: AsyncIterable<CodeChunk>,
  scope: IndexScope,
): AsyncGenerator<EmbeddedChunk[]> {
  for await (const chunks of batch(source, BATCH_SIZE)) {
    yield await embedChunks(chunks, scope);
  }
}
