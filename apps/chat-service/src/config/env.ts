import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    PORT: z.coerce.number().nonnegative().default(4002),
    CLIENT_URL: z.string().min(1),
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    BODY_LIMIT: z.string().default("10kb"),
    DATABASE_URL: z.string().min(1),
    OPENAI_API_KEY: z.string().min(1),
    OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),
    OPENAI_TITLE_MODEL: z.string().min(1).default("gpt-4o-mini"),
    QUERY_ROUTER_MODEL: z.string().min(1).default("gpt-4.1-nano"),
    QUERY_REWRITE_MODEL: z.string().min(1).default("gpt-4o-mini"),
    AI_GATEWAY_API_KEY: z.string().min(1),
    AI_GATEWAY_BASE_URL: z.url().optional(),
    RERANK_MODEL: z.string().min(1).default("voyage/rerank-3-lite"),
    QDRANT_URL: z.url(),
    QDRANT_API_KEY: z.string().min(1),
    QDRANT_COLLECTION: z.string().min(1).default("code_chunks"),
    REPOSITORY_SERVICE_URL: z.string().min(1),
    SERVICE_REQUEST_TIMEOUT_MS: z.coerce.number().default(5000),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
