import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { REPO_MESSAGES } from "@/constants/repository.messages";
import { ApiError } from "@/core/api-error";
import { Status } from "@/generated/prisma/client";
import { docker } from "@/lib/docker";
import { RepoRepository } from "@/repositories/repo.repository";
import { StatusCodes } from "http-status-codes";

export interface StartIndexingTaskInput {
  repositoryId: string;
  userId: string;
  githubUrl: string;
}

export abstract class IndexingService {
  static async startIndexingTask(
    input: StartIndexingTaskInput,
  ): Promise<string> {
    const { repositoryId, userId } = input;

    try {
      return await IndexingService.runContainer(input);
    } catch (error) {
      await RepoRepository.update(repositoryId, userId, Status.FAILED).catch(
        (updateError) => {
          logger.error(
            { repositoryId, userId, error: updateError },
            "failed to mark repository status as failed",
          );
        },
      );
      throw error;
    }
  }

  private static async runContainer(
    input: StartIndexingTaskInput,
  ): Promise<string> {
    const { repositoryId, userId, githubUrl } = input;

    let container;
    try {
      container = await docker.createContainer({
        Image: env.INDEXING_IMAGE,
        Env: [
          `GIT_URL=${githubUrl}`,
          `REPOSITORY_ID=${repositoryId}`,
          `USER_ID=${userId}`,
        ],
        HostConfig: {
          AutoRemove: true,
        },
      });
    } catch (error) {
      logger.error(
        { repositoryId, userId, error },
        "docker create-container request failed",
      );
      throw new ApiError({
        statusCode: StatusCodes.BAD_GATEWAY,
        message: REPO_MESSAGES.INDEXING_TASK_START_FAILED,
        cause: error,
      });
    }

    try {
      await container.start();
    } catch (error) {
      await container.remove({ force: true }).catch((removeError) => {
        logger.error(
          { repositoryId, userId, error: removeError },
          "failed to remove container after start failure",
        );
      });
      logger.error(
        { repositoryId, userId, error },
        "docker start-container request failed",
      );
      throw new ApiError({
        statusCode: StatusCodes.BAD_GATEWAY,
        message: REPO_MESSAGES.INDEXING_TASK_START_FAILED,
        cause: error,
      });
    }

    const containerId = container.id;
    if (!containerId) {
      logger.error({ repositoryId, userId }, "docker returned no container id");
      throw new ApiError({
        statusCode: StatusCodes.BAD_GATEWAY,
        message: REPO_MESSAGES.INDEXING_TASK_NOT_STARTED,
      });
    }

    logger.info(
      { repositoryId, userId, containerId },
      "started docker indexing container",
    );
    return containerId;
  }
}
