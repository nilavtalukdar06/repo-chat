import { CHAT_MESSAGES } from "@/constants/chat.messages";
import { ApiError } from "@/core/api-error";
import { ChatRole, type Chat, type Messages } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ListChatQuery } from "@/validators/chat";
import { StatusCodes } from "http-status-codes";

export abstract class ChatRepository {
  static async create(userId: string, title: string): Promise<Chat> {
    const now = new Date();
    return await prisma.chat.create({
      data: { userId, title, createdAt: now, updatedAt: now },
    });
  }
  static async get(id: string, userId: string): Promise<Chat | null> {
    return await prisma.chat.findFirst({ where: { id, userId } });
  }
  static async getAll(userId: string, query: ListChatQuery) {
    const { page, limit } = query;
    const where = { userId };
    const [items, total] = await prisma.$transaction([
      prisma.chat.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.chat.count({ where }),
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
    title?: string;
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
        data: {
          updatedAt: now,
          ...(input.title ? { title: input.title } : {}),
        },
      }),
    ]);
    return record;
  }
}
