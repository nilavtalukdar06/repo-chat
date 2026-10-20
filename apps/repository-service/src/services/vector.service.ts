import { VectorRepository } from "@/repositories/vector.repository";

export abstract class VectorService {
  static async deleteAll(repositoryId: string) {
    await VectorRepository.deleteAll(repositoryId);
  }
}
