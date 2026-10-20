import { env } from "@/config/env";
import { CHAT_MESSAGES } from "@/constants/chat.messages";
import { ApiError } from "@/core/api-error";
import { StatusCodes } from "http-status-codes";

export interface Repository {
  id: string;
  name: string;
  description: string | null;
  language: string;
  status: "QUEUED" | "INDEXING" | "INDEXED" | "FAILED";
  userId: string;
}

export abstract class RepositoryService {
  static async getIndexed(id: string, userId: string): Promise<Repository> {
    let response: globalThis.Response;
    try {
      response = await fetch(
        `${env.REPOSITORY_SERVICE_URL}/api/repository/${id}`,
        {
          headers: { "x-user-id": userId },
          signal: AbortSignal.timeout(env.SERVICE_REQUEST_TIMEOUT_MS),
        },
      );
    } catch (error) {
      throw new ApiError({
        statusCode: StatusCodes.BAD_GATEWAY,
        message: CHAT_MESSAGES.REPOSITORY_SERVICE_UNAVAILABLE,
        cause: error,
      });
    }

    if (response.status === StatusCodes.NOT_FOUND) {
      throw new ApiError({
        statusCode: StatusCodes.NOT_FOUND,
        message: CHAT_MESSAGES.REPOSITORY_NOT_FOUND,
      });
    }
    if (!response.ok) {
      throw new ApiError({
        statusCode: StatusCodes.BAD_GATEWAY,
        message: CHAT_MESSAGES.REPOSITORY_SERVICE_UNAVAILABLE,
      });
    }

    const { data } = (await response.json()) as { data?: Repository };
    if (!data || data.userId !== userId) {
      throw new ApiError({
        statusCode: StatusCodes.NOT_FOUND,
        message: CHAT_MESSAGES.REPOSITORY_NOT_FOUND,
      });
    }
    if (data.status !== "INDEXED") {
      throw new ApiError({
        statusCode: StatusCodes.CONFLICT,
        message: CHAT_MESSAGES.REPOSITORY_NOT_INDEXED,
      });
    }
    return data;
  }
}
