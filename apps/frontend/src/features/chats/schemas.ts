import { z } from "zod";

export const renameChatSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(100, "Title must be at most 100 characters long"),
});

export type RenameChatInput = z.infer<typeof renameChatSchema>;

export const statusDataSchema = z.object({
  stage: z.enum(["analyzing", "searching", "reranking", "generating"]),
});

export const sourcesDataSchema = z.array(
  z.object({
    path: z.string(),
    startLine: z.number(),
    endLine: z.number(),
    language: z.string(),
    score: z.number(),
  }),
);

export const chatTitleDataSchema = z.object({
  chatId: z.string(),
  title: z.string(),
});
