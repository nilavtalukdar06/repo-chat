import type { UIMessage } from "ai";
import type { z } from "zod";
import type {
  chatTitleDataSchema,
  sourcesDataSchema,
  statusDataSchema,
} from "./schemas";

export type Chat = {
  id: string;
  title: string;
  userId: string;
  repositoryId: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatListMeta = {
  nextCursor: string | null;
  hasNextPage: boolean;
};

export type RetrievalStage = z.infer<typeof statusDataSchema>["stage"];

export type ChatSource = z.infer<typeof sourcesDataSchema>[number];

export type RepoChatDataTypes = {
  status: z.infer<typeof statusDataSchema>;
  sources: z.infer<typeof sourcesDataSchema>;
  "chat-title": z.infer<typeof chatTitleDataSchema>;
};

export type RepoChatMessage = UIMessage<unknown, RepoChatDataTypes>;

export type ChatDetail = Chat & { messages: RepoChatMessage[] };

export function getMessageText(message: RepoChatMessage) {
  return message.parts
    .flatMap((part) => (part.type === "text" ? part.text : []))
    .join("");
}
