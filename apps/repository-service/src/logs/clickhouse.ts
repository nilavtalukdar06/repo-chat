import { env } from "@/config/env";
import { createClient } from "@clickhouse/client";

export const client = createClient({
  url: env.CLICKHOUSE_URL,
  username: env.CLICKHOUSE_ADMIN,
  password: env.CLICKHOUSE_PASSWORD,
});
