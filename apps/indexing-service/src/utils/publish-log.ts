import { env } from "@/config/env";
import { producer } from "@/lib/kafka";

export async function publishLog(log: string) {
  await producer.send({
    topic: "repo-chat-logs",
    messages: [
      {
        key: "log",
        value: JSON.stringify({
          REPOSITORY_ID: env.REPOSITORY_ID,
          USER_ID: env.USER_ID,
          log,
        }),
      },
    ],
  });
}
