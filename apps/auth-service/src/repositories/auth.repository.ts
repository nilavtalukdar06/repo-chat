import { prisma } from "@/lib/prisma";
import { RegisterInput } from "@/validators/auth";

export abstract class AuthRepository {
  static async create(input: RegisterInput) {
    const data = await prisma.user.create({
      data: input,
    });
    return data;
  }
  static async get(id: string) {
    const data = await prisma.user.findUnique({
      where: {
        id,
      },
    });
    return data;
  }
  static async findByEmail(email: string) {
    const data = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    return data;
  }
  static async getAll() {
    const data = await prisma.user.findMany();
    return data;
  }
}
