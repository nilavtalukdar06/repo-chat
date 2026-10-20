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
    AWS_REGION: z.string().min(1),
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    ECS_CLUSTER: z.string().min(1),
    ECS_TASK_DEFINITION: z.string().min(1),
    ECS_CONTAINER_NAME: z.string().min(1),
    ECS_SUBNET_IDS: z
      .string()
      .min(1)
      .transform((value) => value.split(",").map((id) => id.trim())),
    ECS_SECURITY_GROUP_IDS: z
      .string()
      .min(1)
      .transform((value) => value.split(",").map((id) => id.trim())),
    ECS_LAUNCH_TYPE: z.enum(["FARGATE", "EC2"]).default("FARGATE"),
    ECS_ASSIGN_PUBLIC_IP: z.enum(["ENABLED", "DISABLED"]).default("DISABLED"),
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
