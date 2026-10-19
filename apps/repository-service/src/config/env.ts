import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    PORT: z.coerce.number().nonnegative().default(4001),
    CLIENT_URL: z.string().min(1),
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    RATE_LIMIT_WINDOW_MS: z.coerce.number(),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number(),
    BODY_LIMIT: z.string().default("10kb"),
    DATABASE_URL: z.string().min(1),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
