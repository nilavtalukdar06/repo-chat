import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    KAFKA_BROKER: z.string().min(1),
    KAFKA_SSL: z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),
    KAFKA_SASL: z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),
    KAFKA_USERNAME: z.string().min(1).optional(),
    KAFKA_PASSWORD: z.string().min(1).optional(),
    DATABASE_URL: z.url(),
    REPOSITORY_ID: z.string().min(1),
    USER_ID: z.string().min(1),
    OUTPUT_DIR: z.string().min(1).default("/home/app/output"),
    QDRANT_URL: z.url(),
    QDRANT_API_KEY: z.string().min(1).optional(),
    OPENAI_API_KEY: z.string().min(1),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
