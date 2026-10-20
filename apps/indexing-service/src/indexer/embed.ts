import { createHash } from "node:crypto";
import { embedMany } from "ai";
import type { CodeChunk } from "@/indexer/chunk";

const EMBEDDING_MODEL = "alibaba/qwen3-embedding-0.6b";
export const EMBEDDING_DIMENSIONS = 1024;
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

function uuidV5(name: string): string {
  const namespace = Buffer.from(POINT_ID_NAMESPACE.replaceAll("-", ""), "hex");
  const hash = createHash("sha1").update(namespace).update(name).digest();
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

export function pointId(
  repositoryId: string,
  filePath: string,
  chunkIndex: number,
): string {
  return uuidV5(`${repositoryId}:${filePath}:${chunkIndex}`);
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
    model: EMBEDDING_MODEL,
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
  source: AsyncIterable<CodeChunk[]>,
  scope: IndexScope,
): AsyncGenerator<EmbeddedChunk[]> {
  const buffer: CodeChunk[] = [];
  for await (const fileChunks of source) {
    buffer.push(...fileChunks);
    while (buffer.length >= BATCH_SIZE) {
      yield await embedChunks(buffer.splice(0, BATCH_SIZE), scope);
    }
  }
  if (buffer.length > 0) yield await embedChunks(buffer, scope);
}
