import { logger } from "@/config/logger";
import { CHAT_MESSAGES } from "@/constants/chat.messages";
import { ApiError } from "@/core/api-error";
import { ChatRole, type Chat } from "@/generated/prisma/client";
import { chatModel } from "@/lib/openai";
import { ChatRepository } from "@/repositories/chat.repository";
import { getMessageText, toUIMessage, toUIMessages } from "@/utils/ui-message";
import type {
  CreateChatInput,
  ListChatQuery,
  SendMessageInput,
  UpdateChatInput,
} from "@/validators/chat";
import {
  convertToModelMessages,
  pipeUIMessageStreamToResponse,
  streamText,
  toUIMessageStream,
} from "ai";
import type { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { randomUUID } from "node:crypto";

const DEFAULT_TITLE = "New chat";
const MAX_TITLE_LENGTH = 60;
const HISTORY_LIMIT = 50;
const SYSTEM_PROMPT =
  "You are a helpful assistant for developers who want to understand and work with code repositories. Answer clearly and concisely, and use markdown for code.";

export abstract class ChatService {
  static async create(userId: string, input: CreateChatInput) {
    return await ChatRepository.create(userId, input.title ?? DEFAULT_TITLE);
  }

  static async get(id: string, userId: string) {
    const chat = await ChatService.getOwned(id, userId);
    const records = await ChatRepository.getMessages(chat.id);
    return { ...chat, messages: toUIMessages(records) };
  }

  static async getAll(userId: string, query: ListChatQuery) {
    return await ChatRepository.getAll(userId, query);
  }

  static async update(id: string, userId: string, input: UpdateChatInput) {
    return await ChatRepository.rename(id, userId, input.title);
  }

  static async delete(id: string, userId: string) {
    await ChatRepository.delete(id, userId);
  }

  static async stream(
    id: string,
    userId: string,
    input: SendMessageInput,
    res: Response,
  ) {
    const chat = await ChatService.getOwned(id, userId);
    const text = input.message.parts.map((part) => part.text).join("\n");

    const history = await ChatRepository.getMessages(chat.id, HISTORY_LIMIT);
    const userRecord = await ChatRepository.addMessage({
      chatId: chat.id,
      role: ChatRole.USER,
      message: text,
      ...(history.length === 0 && chat.title === DEFAULT_TITLE
        ? { title: text.slice(0, MAX_TITLE_LENGTH) }
        : {}),
    });

    const messages = [...toUIMessages(history), toUIMessage(userRecord)!];

    const result = streamText({
      model: chatModel,
      instructions: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
    });

    // Run the model to completion so the reply is saved even if the client disconnects.
    void result.consumeStream();

    await pipeUIMessageStreamToResponse({
      response: res,
      stream: toUIMessageStream({
        stream: result.stream,
        originalMessages: messages,
        generateMessageId: randomUUID,
        onError: (error) => {
          logger.error({ chatId: chat.id, error });
          return CHAT_MESSAGES.STREAM_FAILED;
        },
        onEnd: async ({ messages: finalMessages }) => {
          try {
            const reply = finalMessages.at(-1);
            if (reply?.role !== "assistant") return;
            const replyText = getMessageText(reply);
            if (!replyText) return;
            await ChatRepository.addMessage({
              id: reply.id,
              chatId: chat.id,
              role: ChatRole.ASSISTANT,
              message: replyText,
            });
          } catch (error) {
            logger.error({ chatId: chat.id, error });
          }
        },
      }),
    });
  }

  private static async getOwned(id: string, userId: string): Promise<Chat> {
    const chat = await ChatRepository.get(id, userId);
    if (!chat) {
      throw new ApiError({
        statusCode: StatusCodes.NOT_FOUND,
        message: CHAT_MESSAGES.NOT_FOUND,
      });
    }
    return chat;
  }
}
