import { Status } from "@/generated/prisma/client";
import { z } from "zod";

export const listRepoSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
});

export const createRepoSchema = z.object({
  githubUrl: z
    .string()
    .trim()
    .url("please provide a valid github repository url"),
});

export const updateRepoStatusSchema = z.object({
  status: z.enum(Status),
});

export const repoIdParamsSchema = z.object({
  id: z.uuid("please provide a valid repository id"),
});

export type ListRepoQuery = z.infer<typeof listRepoSchema>;
export type CreateRepoInput = z.infer<typeof createRepoSchema>;
export type UpdateRepoStatusInput = z.infer<typeof updateRepoStatusSchema>;
export type RepoIdParams = z.infer<typeof repoIdParamsSchema>;
