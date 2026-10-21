import { z } from "zod";

const GITHUB_REPO_PATTERN =
  /^https:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/;

export const createRepositorySchema = z.object({
  githubUrl: z
    .string()
    .trim()
    .regex(GITHUB_REPO_PATTERN, "Please provide a valid GitHub repository URL"),
});

export type CreateRepositoryInput = z.infer<typeof createRepositorySchema>;
