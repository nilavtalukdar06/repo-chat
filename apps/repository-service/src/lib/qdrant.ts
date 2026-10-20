import { env } from "@/config/env";
import { QdrantClient } from "@qdrant/js-client-rest";

export const qdrantClient = new QdrantClient({
  url: env.QDRANT_URL,
  apiKey: env.QDRANT_API_KEY,
});
