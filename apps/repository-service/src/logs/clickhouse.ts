import { env } from "@/config/env";
import { createClient } from "@clickhouse/client";

export const client = createClient({
  url: env.CLICKHOUSE_URL,
  username: env.CLICKHOUSE_ADMIN,
  password: env.CLICKHOUSE_PASSWORD,
});

export async function isClickhouseHealthy() {
  try {
    const result = await client.ping();
    return result.success;
  } catch {
    return false;
  }
}
