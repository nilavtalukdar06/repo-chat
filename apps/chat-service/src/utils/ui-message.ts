import { ChatRole, type Messages } from "@/generated/prisma/client";
import type { UIMessage } from "ai";

const UI_ROLES = {
  [ChatRole.USER]: "user",
  [ChatRole.ASSISTANT]: "assistant",
  [ChatRole.SYSTEM]: "system",
} as const;

export function toUIMessage(record: Messages): UIMessage | null {
  const role = UI_ROLES[record.role as keyof typeof UI_ROLES];
  if (!role) return null;
  return {
    id: record.id,
    role,
    parts: [{ type: "text", text: record.message }],
  };
}

export function toUIMessages(records: Messages[]): UIMessage[] {
  return records.flatMap((record) => toUIMessage(record) ?? []);
}

export function getMessageText(message: UIMessage): string {
  return message.parts
    .flatMap((part) => (part.type === "text" ? part.text : []))
    .join("");
}
