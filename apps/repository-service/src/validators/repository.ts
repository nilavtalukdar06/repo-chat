import { z } from "zod";

export const listRepoSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
});

export type ListRepoQuery = z.infer<typeof listRepoSchema>;
