import { REPO_MESSAGES } from "@/constants/repository.messages";
import { ApiError } from "@/core/api-error";
import { Repository, Status } from "@/generated/prisma/client";
import {
  RepoRepository,
  RepositoryInput,
} from "@/repositories/repo.repository";
import { IndexingService } from "@/services/indexing.service";
import { LogService } from "@/services/log.service";
import { VectorService } from "@/services/vector.service";
import { fetchGithubRepo, parseGithubUrl } from "@/utils/github";
import { ListRepoQuery } from "@/validators/repository";
import { StatusCodes } from "http-status-codes";

export abstract class RepoService {
  static async create(githubUrl: string, userId: string): Promise<Repository> {
    const { owner, repo } = parseGithubUrl(githubUrl);
    const githubRepo = await fetchGithubRepo(owner, repo);

    const input: RepositoryInput = {
      name: githubRepo.name,
      description: githubRepo.description ?? undefined,
      stars: githubRepo.stargazers_count,
      language: githubRepo.language ?? "unknown",
      githubUrl,
      userId,
    };

    const repository = await RepoRepository.create(input);

    await IndexingService.startIndexingTask({
      repositoryId: repository.id,
      userId: repository.userId,
      githubUrl: repository.githubUrl,
    });

    return repository;
  }

  static async get(id: string): Promise<Repository> {
    const repository = await RepoRepository.get(id);
    if (!repository) {
      throw new ApiError({
        statusCode: StatusCodes.NOT_FOUND,
        message: REPO_MESSAGES.NOT_FOUND,
      });
    }
    return repository;
  }

  static async getAll(userId: string, query: ListRepoQuery) {
    return await RepoRepository.getAll(userId, query);
  }

  static async delete(id: string): Promise<Repository> {
    const repository = await RepoRepository.delete(id);
    await LogService.deleteAll(repository.id);
    await VectorService.deleteAll(repository.id);
    return repository;
  }

  static async update(id: string, status: Status): Promise<Repository> {
    const repository = await RepoRepository.update(id, status);

    if (status === Status.QUEUED) {
      await IndexingService.startIndexingTask({
        repositoryId: repository.id,
        userId: repository.userId,
        githubUrl: repository.githubUrl,
      });
    }

    return repository;
  }
}
