import pRetry from "p-retry";
import { client } from "@/lib/qdrant";
import { EMBEDDING_DIMENSIONS, type EmbeddedChunk } from "@/indexer/embed";

const COLLECTION_NAME = "code_chunks";

export async function ensureCollection(): Promise<void> {
  const { exists } = await client.collectionExists(COLLECTION_NAME);
  if (!exists) {
    try {
      await client.createCollection(COLLECTION_NAME, {
        vectors: { size: EMBEDDING_DIMENSIONS, distance: "Cosine" },
      });
      await client.createPayloadIndex(COLLECTION_NAME, {
        field_name: "repositoryId",
        field_schema: { type: "keyword", is_tenant: true },
        wait: true,
      });
      await client.createPayloadIndex(COLLECTION_NAME, {
        field_name: "userId",
        field_schema: "keyword",
        wait: true,
      });
    } catch (error) {
      const { exists: createdByOther } =
        await client.collectionExists(COLLECTION_NAME);
      if (!createdByOther) throw error;
    }
    return;
  }

  const { config } = await client.getCollection(COLLECTION_NAME);
  const vectors = config.params.vectors;
  const size = vectors && "size" in vectors ? vectors.size : undefined;
  if (size !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `collection ${COLLECTION_NAME} holds ${size}-dimension vectors, expected ${EMBEDDING_DIMENSIONS}`,
    );
  }
}

export async function deleteRepositoryVectors(
  repositoryId: string,
): Promise<void> {
  await client.delete(COLLECTION_NAME, {
    wait: true,
    filter: { must: [{ key: "repositoryId", match: { value: repositoryId } }] },
  });
}

export async function upsertChunks(chunks: EmbeddedChunk[]): Promise<void> {
  await pRetry(
    () =>
      client.upsert(COLLECTION_NAME, {
        wait: true,
        points: chunks.map(({ id, vector, payload }) => ({
          id,
          vector,
          payload: { ...payload },
        })),
      }),
    { retries: 3 },
  );
}
