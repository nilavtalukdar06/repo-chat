import { z } from "zod";

const MAX_MESSAGE_LENGTH = 4000;

export const chatIdParamsSchema = z.object({
  id: z.uuid("please provide a valid chat id"),
});

const chatCursorSchema = z.object({
  updatedAt: z.iso.datetime().transform((value) => new Date(value)),
  id: z.uuid(),
});

export type ChatCursor = z.infer<typeof chatCursorSchema>;

export function encodeChatCursor(cursor: ChatCursor): string {
  return Buffer.from(
    JSON.stringify({
      updatedAt: cursor.updatedAt.toISOString(),
      id: cursor.id,
    }),
  ).toString("base64url");
}

export const listChatSchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  cursor: z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (!value) return undefined;
      try {
        const decoded = JSON.parse(
          Buffer.from(value, "base64url").toString("utf8"),
        );
        return chatCursorSchema.parse(decoded);
      } catch {
        ctx.addIssue({ code: "custom", message: "invalid cursor" });
        return z.NEVER;
      }
    }),
});

export const updateChatSchema = z.object({
  title: z.string().trim().min(1).max(100),
});

export const sendMessageSchema = z.object({
  message: z.object({
    parts: z
      .array(
        z.object({
          type: z.literal("text"),
          text: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
        }),
      )
      .min(1),
  }),
});

export type ChatIdParams = z.infer<typeof chatIdParamsSchema>;
export type ListChatQuery = z.infer<typeof listChatSchema>;
export type UpdateChatInput = z.infer<typeof updateChatSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
