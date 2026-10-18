import { createClient } from "redis";
import { env } from "@/config/env";
import { logger } from "@/config/logger";

export const redis = createClient({ url: env.REDIS_URL });

redis.on("ready", () => {
  logger.info("redis connection is ready");
});

redis.on("error", (error) => {
  logger.error(error, "redis connection error");
});

redis.connect().catch((error) => {
  logger.error(error, "redis initial connection failed");
});

export function isRedisReady() {
  return redis.isReady;
}
