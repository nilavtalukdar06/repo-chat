import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    PORT: z.coerce.number().nonnegative().default(4002),
    CLIENT_URL: z.string().min(1),
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(1000),
    AUTH_SERVICE_URL: z.string().min(1),
    REPOSITORY_SERVICE_URL: z.string().min(1),
    CHAT_SERVICE_URL: z.string().min(1),
    SERVICE_REQUEST_TIMEOUT_MS: z.coerce.number().default(5000),
    FRONTEND_DIR: z.string().min(1).optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
