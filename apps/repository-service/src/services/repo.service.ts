import { REPO_MESSAGES } from "@/constants/repository.messages";
import { ApiError } from "@/core/api-error";
import { Repository, Status } from "@/generated/prisma/client";
import {
  RepoRepository,
  RepositoryInput,
} from "@/repositories/repo.repository";
import { ChatService } from "@/services/chat.service";
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

  static async get(id: string, userId: string): Promise<Repository> {
    const repository = await RepoRepository.get(id, userId);
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

  static async getLogs(id: string, userId: string) {
    const repository = await RepoService.get(id, userId);
    return await LogService.getAll(repository.id, userId);
  }

  static async delete(id: string, userId: string): Promise<Repository> {
    const repository = await RepoService.get(id, userId);
    if (
      repository.status === Status.QUEUED ||
      repository.status === Status.INDEXING
    ) {
      throw new ApiError({
        statusCode: StatusCodes.CONFLICT,
        message: REPO_MESSAGES.DELETE_WHILE_INDEXING,
      });
    }
    await LogService.deleteAll(repository.id);
    await VectorService.deleteAll(repository.id);
    await ChatService.deleteAll(repository.id, userId);
    return await RepoRepository.delete(repository.id, userId);
  }

  static async update(
    id: string,
    userId: string,
    status: Status,
  ): Promise<Repository> {
    const repository = await RepoRepository.update(id, userId, status);

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
