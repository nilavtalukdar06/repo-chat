import { AUTH_MESSAGES } from "@/constants/auth.messages";
import { ApiError } from "@/core/api-error";
import { Prisma, User } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthUser } from "@/types/express";
import { RegisterInput } from "@/validators/auth";
import { StatusCodes } from "http-status-codes";

const UNIQUE_CONSTRAINT_VIOLATION = "P2002";

export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export abstract class AuthRepository {
  static async create(input: RegisterInput): Promise<User> {
    try {
      return await prisma.user.create({
        data: input,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ApiError({
          statusCode: StatusCodes.CONFLICT,
          message: AUTH_MESSAGES.USER_ALREADY_EXISTS,
          cause: error,
        });
      }
      throw error;
    }
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
