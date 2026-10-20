import { qdrantClient } from "@/lib/qdrant";

const COLLECTION_NAME = "code_chunks";

export abstract class VectorRepository {
  static async deleteAll(repositoryId: string) {
    const { exists } = await qdrantClient.collectionExists(COLLECTION_NAME);
    if (!exists) return;
    await qdrantClient.delete(COLLECTION_NAME, {
      wait: true,
      filter: {
        must: [{ key: "repositoryId", match: { value: repositoryId } }],
      },
    });
  }
}
