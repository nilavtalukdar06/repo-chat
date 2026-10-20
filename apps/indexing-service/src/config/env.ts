import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    KAFKA_BROKER: z.string().min(1),
    KAFKA_USERNAME: z.string().min(1),
    KAFKA_PASSWORD: z.string().min(1),
    DATABASE_URL: z.url(),
    REPOSITORY_ID: z.string().min(1),
    USER_ID: z.string().min(1),
    OUTPUT_DIR: z.string().min(1).default("/home/app/output"),
    QDRANT_URL: z.url(),
    QDRANT_API_KEY: z.string().min(1),
    AI_GATEWAY_API_KEY: z.string().min(1),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
