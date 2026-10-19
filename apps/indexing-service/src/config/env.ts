import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    KAFKA_BROKER: z.string().min(1),
    KAFKA_USERNAME: z.string().min(1),
    KAFKA_PASSWORD: z.string().min(1),
    DATABASE_URL: z.url(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
