import { producer } from "@/lib/kafka";
import { REPOSITORY_ID, USER_ID } from "..";

export async function publishLog(log: string) {
  await producer.send({
    topic: "repo-chat-logs",
    messages: [
      {
        key: "log",
        value: JSON.stringify({
          REPOSITORY_ID,
          USER_ID,
          log,
        }),
      },
    ],
  });
}
