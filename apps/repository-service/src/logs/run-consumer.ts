import { randomUUID } from "node:crypto";
import type { EachBatchPayload } from "kafkajs";
import { z } from "zod";
import { logger } from "@/config/logger";
import { client } from "./clickhouse";
import { consumer } from "./kafka-consumer";

const TOPIC = "repo-chat-logs";
const TABLE = "log_events";

const logMessageSchema = z.object({
  REPOSITORY_ID: z.string().min(1),
  USER_ID: z.string().min(1),
  log: z.string(),
  metadata: z.unknown().optional(),
});

type LogRow = {
  event_id: string;
  repository_id: string;
  user_id: string;
  log: string;
  metadata: string | null;
};

function parseMessage(value: Buffer | null): LogRow | null {
  if (!value) return null;
  try {
    const parsed = logMessageSchema.safeParse(JSON.parse(value.toString()));
    if (!parsed.success) return null;
    const { REPOSITORY_ID, USER_ID, log, metadata } = parsed.data;
    return {
      event_id: randomUUID(),
      repository_id: REPOSITORY_ID,
      user_id: USER_ID,
      log,
      metadata: metadata == null ? null : JSON.stringify(metadata),
    };
  } catch {
    return null;
  }
}

async function handleBatch({
  batch,
  resolveOffset,
  heartbeat,
  commitOffsetsIfNecessary,
  isRunning,
  isStale,
}: EachBatchPayload) {
  const rows: LogRow[] = [];
  let skipped = 0;
  for (const message of batch.messages) {
    const row = parseMessage(message.value);
    if (row) rows.push(row);
    else skipped++;
  }
  if (!isRunning() || isStale()) return;
  if (rows.length > 0) {
    await client.insert({
      table: TABLE,
      values: rows,
      format: "JSONEachRow",
    });
  }
  if (skipped > 0) {
    logger.warn(
      { partition: batch.partition, skipped },
      "skipped malformed log messages",
    );
  }
  for (const message of batch.messages) {
    resolveOffset(message.offset);
  }
  await commitOffsetsIfNecessary({
    topics: [
      {
        topic: batch.topic,
        partitions: [
          {
            partition: batch.partition,
            offset: (BigInt(batch.lastOffset()) + 1n).toString(),
          },
        ],
      },
    ],
  });
  await heartbeat();
  logger.debug(
    { partition: batch.partition, inserted: rows.length },
    "inserted log batch into clickhouse",
  );
}

export async function startLogConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: true });
  await consumer.run({
    autoCommit: false,
    eachBatchAutoResolve: false,
    eachBatch: handleBatch,
  });
  logger.info(`log consumer subscribed to ${TOPIC}`);
}

export async function stopLogConsumer() {
  await consumer.disconnect();
  await client.close();
}
