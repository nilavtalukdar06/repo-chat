import { DefaultChatTransport } from "ai";
import { api } from "@/lib/api";
import type { RepoChatMessage } from "./types";

export function createChatTransport(repositoryId: string) {
  return new DefaultChatTransport<RepoChatMessage>({
    credentials: "include",
    prepareSendMessagesRequest: ({ id, messages }) => {
      const parts =
        messages
          .at(-1)
          ?.parts.flatMap((part) =>
            part.type === "text" ? { type: "text", text: part.text } : [],
          ) ?? [];
      return {
        api: `${api.defaults.baseURL}/api/chat/${id}/messages`,
        body: { repositoryId, message: { parts } },
      };
    },
  });
}
