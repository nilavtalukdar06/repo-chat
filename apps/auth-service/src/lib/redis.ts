import { Redis } from "ioredis";
import { env } from "@/config/env";
import { logger } from "@/config/logger";

export const redis = new Redis(env.REDIS_URL);

redis.on("ready", () => {
  logger.info("redis connection is ready");
});

redis.on("error", (error) => {
  logger.error(error, "redis connection error");
});

export function isRedisReady() {
  return redis.status === "ready";
}
