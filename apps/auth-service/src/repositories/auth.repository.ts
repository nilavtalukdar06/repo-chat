import { User } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthUser } from "@/types/express";
import { RegisterInput } from "@/validators/auth";

export abstract class AuthRepository {
  static async create(input: RegisterInput): Promise<User> {
    const data = await prisma.user.create({
      data: input,
    });
    return data;
  }
  static async get(id: string): Promise<AuthUser | null> {
    const data = await prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return data;
  }
  static async findByEmail(email: string): Promise<User | null> {
    const data = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    return data;
  }
  static async getAll(): Promise<AuthUser[]> {
    const data = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return data;
  }
}
