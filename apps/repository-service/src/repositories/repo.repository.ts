import { REPO_MESSAGES } from "@/constants/repository.messages";
import { ApiError } from "@/core/api-error";
import { Prisma, Repository, Status } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ListRepoQuery } from "@/validators/repository";
import { StatusCodes } from "http-status-codes";

const RECORD_NOT_FOUND = "P2025";

export interface RepositoryInput {
  name: string;
  stars: number;
  language: string;
  githubUrl: string;
  description?: string;
  userId: string;
}

export abstract class RepoRepository {
  static async create(input: RepositoryInput): Promise<Repository> {
    const data = await prisma.repository.create({
      data: input,
    });
    return data;
  }
  static async get(id: string): Promise<Repository | null> {
    const data = await prisma.repository.findUnique({
      where: {
        id,
      },
    });
    return data;
  }
  static async getAll(userId: string, query: ListRepoQuery) {
    const { page, limit, search } = query;
    const where: Prisma.RepositoryWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
          userId,
        }
      : {
          userId,
        };
    const [items, total] = await prisma.$transaction([
      prisma.repository.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.repository.count({ where }),
    ]);
    const totalPages = Math.ceil(total / limit);
    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
  static async delete(id: string): Promise<Repository> {
    try {
      const data = await prisma.repository.delete({
        where: {
          id,
        },
      });
      return data;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === RECORD_NOT_FOUND
      ) {
        throw new ApiError({
          statusCode: StatusCodes.NOT_FOUND,
          message: REPO_MESSAGES.NOT_FOUND,
          cause: error,
        });
      }
      throw error;
    }
  }
  static async update(id: string, status: Status): Promise<Repository> {
    try {
      const data = await prisma.repository.update({
        where: {
          id,
        },
        data: {
          status,
        },
      });
      return data;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === RECORD_NOT_FOUND
      ) {
        throw new ApiError({
          statusCode: StatusCodes.NOT_FOUND,
          message: REPO_MESSAGES.NOT_FOUND,
          cause: error,
        });
      }
      throw error;
    }
  }
}
