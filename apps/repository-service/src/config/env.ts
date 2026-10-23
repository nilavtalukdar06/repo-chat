import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    PORT: z.coerce.number().nonnegative().default(4001),
    CLIENT_URL: z.string().min(1),
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    BODY_LIMIT: z.string().default("10kb"),
    DATABASE_URL: z.string().min(1),
    DOCKER_SOCKET_PATH: z.string().min(1).default("/var/run/docker.sock"),
    INDEXING_IMAGE: z.string().min(1),
    CLICKHOUSE_URL: z.url(),
    CLICKHOUSE_ADMIN: z.string().min(1),
    CLICKHOUSE_PASSWORD: z.string().min(1),
    KAFKA_BROKER: z.string().min(1),
    KAFKA_USERNAME: z.string().min(1),
    KAFKA_PASSWORD: z.string().min(1),
    QDRANT_URL: z.url(),
    QDRANT_API_KEY: z.string().min(1),
    CHAT_SERVICE_URL: z.string().min(1),
    SERVICE_REQUEST_TIMEOUT_MS: z.coerce.number().default(5000),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
