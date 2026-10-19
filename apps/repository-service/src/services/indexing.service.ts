import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { REPO_MESSAGES } from "@/constants/repository.messages";
import { ApiError } from "@/core/api-error";
import { ecsClient } from "@/lib/ecs";
import { RunTaskCommand } from "@aws-sdk/client-ecs";
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
    const { repositoryId, userId, githubUrl } = input;

    let response;
    try {
      response = await ecsClient.send(
        new RunTaskCommand({
          cluster: env.ECS_CLUSTER,
          taskDefinition: env.ECS_TASK_DEFINITION,
          launchType: env.ECS_LAUNCH_TYPE,
          count: 1,
          networkConfiguration: {
            awsvpcConfiguration: {
              subnets: env.ECS_SUBNET_IDS,
              securityGroups: env.ECS_SECURITY_GROUP_IDS,
              assignPublicIp: env.ECS_ASSIGN_PUBLIC_IP,
            },
          },
          overrides: {
            containerOverrides: [
              {
                name: env.ECS_CONTAINER_NAME,
                environment: [
                  { name: "GIT_URL", value: githubUrl },
                  { name: "REPOSITORY_ID", value: repositoryId },
                  { name: "USER_ID", value: userId },
                ],
              },
            ],
          },
        }),
      );
    } catch (error) {
      logger.error(
        { repositoryId, userId, error },
        "ecs run-task request failed",
      );
      throw new ApiError({
        statusCode: StatusCodes.BAD_GATEWAY,
        message: REPO_MESSAGES.INDEXING_TASK_START_FAILED,
        cause: error,
      });
    }

    if (response.failures && response.failures.length > 0) {
      logger.error(
        { repositoryId, userId, failures: response.failures },
        "ecs rejected the indexing run-task request",
      );
      throw new ApiError({
        statusCode: StatusCodes.BAD_GATEWAY,
        message: REPO_MESSAGES.INDEXING_TASK_START_FAILED,
        errors: response.failures,
      });
    }

    const taskArn = response.tasks?.[0]?.taskArn;
    if (!taskArn) {
      logger.error({ repositoryId, userId }, "ecs returned no task arn");
      throw new ApiError({
        statusCode: StatusCodes.BAD_GATEWAY,
        message: REPO_MESSAGES.INDEXING_TASK_NOT_STARTED,
      });
    }

    logger.info({ repositoryId, userId, taskArn }, "started ecs indexing task");
    return taskArn;
  }
}
