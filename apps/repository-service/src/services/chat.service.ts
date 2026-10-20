import { env } from "@/config/env";
import { REPO_MESSAGES } from "@/constants/repository.messages";
import { ApiError } from "@/core/api-error";
import axios from "axios";
import { StatusCodes } from "http-status-codes";

export abstract class ChatService {
  static async deleteAll(repositoryId: string, userId: string) {
    try {
      await axios.delete(`${env.CHAT_SERVICE_URL}/api/chat`, {
        params: { repositoryId },
        headers: { "x-user-id": userId },
        timeout: env.SERVICE_REQUEST_TIMEOUT_MS,
      });
    } catch (error) {
      throw new ApiError({
        statusCode: StatusCodes.BAD_GATEWAY,
        message: REPO_MESSAGES.CHAT_SERVICE_UNAVAILABLE,
        cause: error,
      });
    }
  }
}
