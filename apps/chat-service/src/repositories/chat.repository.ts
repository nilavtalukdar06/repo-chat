import { CHAT_MESSAGES } from "@/constants/chat.messages";
import { ApiError } from "@/core/api-error";
import {
  ChatRole,
  type Chat,
  type Messages,
  type Prisma,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { encodeChatCursor, type ListChatQuery } from "@/validators/chat";
import { StatusCodes } from "http-status-codes";

export abstract class ChatRepository {
  static async findById(id: string): Promise<Chat | null> {
    return await prisma.chat.findUnique({ where: { id } });
  }
  static async get(id: string, userId: string): Promise<Chat | null> {
    return await prisma.chat.findFirst({ where: { id, userId } });
  }
  static async createWithMessage(input: {
    id: string;
    userId: string;
    repositoryId: string;
    title: string;
    message: string;
  }): Promise<Messages> {
    const now = new Date();
    const chat = await prisma.chat.create({
      data: {
        id: input.id,
        userId: input.userId,
        repositoryId: input.repositoryId,
        title: input.title,
        createdAt: now,
        updatedAt: now,
        messages: {
          create: {
            role: ChatRole.USER,
            message: input.message,
            createdAt: now,
            updatedAt: now,
          },
        },
      },
      include: { messages: true },
    });
    return chat.messages[0]!;
  }
  static async getAll(userId: string, query: ListChatQuery) {
    const { repositoryId, limit, cursor } = query;
    const where: Prisma.ChatWhereInput = cursor
      ? {
          userId,
          repositoryId,
          OR: [
            { updatedAt: { lt: cursor.updatedAt } },
            { updatedAt: cursor.updatedAt, id: { lt: cursor.id } },
          ],
        }
      : { userId, repositoryId };
    const rows = await prisma.chat.findMany({
      where,
      take: limit + 1,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    });
    const hasNextPage = rows.length > limit;
    const items = hasNextPage ? rows.slice(0, limit) : rows;
    const last = items.at(-1);
    return {
      data: items,
      meta: {
        nextCursor: hasNextPage && last ? encodeChatCursor(last) : null,
        hasNextPage,
      },
    };
  }
  static async rename(id: string, userId: string, title: string) {
    const { count } = await prisma.chat.updateMany({
      where: { id, userId },
      data: { title, updatedAt: new Date() },
    });
    if (count === 0) {
      throw new ApiError({
        statusCode: StatusCodes.NOT_FOUND,
        message: CHAT_MESSAGES.NOT_FOUND,
      });
    }
    return await prisma.chat.findUniqueOrThrow({ where: { id } });
  }
  static async setTitle(id: string, title: string): Promise<void> {
    await prisma.chat.update({ where: { id }, data: { title } });
  }
  static async delete(id: string, userId: string): Promise<void> {
    const { count } = await prisma.chat.deleteMany({ where: { id, userId } });
    if (count === 0) {
      throw new ApiError({
        statusCode: StatusCodes.NOT_FOUND,
        message: CHAT_MESSAGES.NOT_FOUND,
      });
    }
  }
  static async getMessages(chatId: string, limit?: number) {
    const records = await prisma.messages.findMany({
      where: { chatId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(limit ? { take: limit } : {}),
    });
    return records.reverse();
  }
  static async addMessage(input: {
    id?: string;
    chatId: string;
    role: ChatRole;
    message: string;
  }): Promise<Messages> {
    const now = new Date();
    const [record] = await prisma.$transaction([
      prisma.messages.create({
        data: {
          ...(input.id ? { id: input.id } : {}),
          chatId: input.chatId,
          role: input.role,
          message: input.message,
          createdAt: now,
          updatedAt: now,
        },
      }),
      prisma.chat.update({
        where: { id: input.chatId },
        data: { updatedAt: now },
      }),
    ]);
    return record;
  }
}
