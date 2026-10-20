import { client } from "@/logs/clickhouse";

const TABLE = "log_events";

export interface LogEvent {
  event_id: string;
  timestamp: string;
  repository_id: string;
  user_id: string;
  log: string;
  metadata: string | null;
}

export abstract class LogRepository {
  static async getAll(repositoryId: string, userId: string) {
    const result = await client.query({
      query: `
        SELECT event_id, timestamp, repository_id, user_id, log, metadata
        FROM ${TABLE}
        WHERE repository_id = {repositoryId:String} AND user_id = {userId:String}
        ORDER BY timestamp ASC
      `,
      query_params: { repositoryId, userId },
      format: "JSONEachRow",
    });
    return await result.json<LogEvent>();
  }

  static async deleteAll(repositoryId: string) {
    await client.command({
      query: `ALTER TABLE ${TABLE} DELETE WHERE repository_id = {repositoryId:String}`,
      query_params: { repositoryId },
    });
  }
}
