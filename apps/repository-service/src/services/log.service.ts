import { LogRepository } from "@/repositories/log.repository";

export abstract class LogService {
  static async getAll(repositoryId: string, userId: string) {
    return await LogRepository.getAll(repositoryId, userId);
  }

  static async deleteAll(repositoryId: string) {
    await LogRepository.deleteAll(repositoryId);
  }
}
