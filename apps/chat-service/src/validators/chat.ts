import { z } from "zod";

const MAX_MESSAGE_LENGTH = 4000;

export const chatIdParamsSchema = z.object({
  id: z.uuid("please provide a valid chat id"),
});

export const listChatSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const createChatSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
});

export const updateChatSchema = z.object({
  title: z.string().trim().min(1).max(100),
});

// useChat posts the new UI message; only its text parts are persisted.
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
export type CreateChatInput = z.infer<typeof createChatSchema>;
export type UpdateChatInput = z.infer<typeof updateChatSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
