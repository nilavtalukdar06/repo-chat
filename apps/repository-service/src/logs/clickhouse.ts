import { env } from "@/config/env";
import { createClient } from "@clickhouse/client";

export const client = createClient({
  url: env.CLICKHOUSE_URL,
  username: env.CLICKHOUSE_ADMIN,
  password: env.CLICKHOUSE_PASSWORD,
});

const LOG_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS log_events (
  event_id UUID,
  timestamp DateTime MATERIALIZED now(),
  repository_id String,
  user_id String,
  log String,
  metadata Nullable(String)
)
ENGINE=MergeTree PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp)
`;

export async function ensureLogTable() {
  await client.command({
    query: LOG_TABLE_DDL,
    clickhouse_settings: { wait_end_of_query: 1 },
  });
}

export async function isClickhouseHealthy() {
  try {
    const result = await client.ping();
    return result.success;
  } catch {
    return false;
  }
}
