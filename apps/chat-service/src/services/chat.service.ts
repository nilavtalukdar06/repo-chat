import { logger } from "@/config/logger";
import { CHAT_MESSAGES } from "@/constants/chat.messages";
import { ApiError } from "@/core/api-error";
import {
  ChatRole,
  Prisma,
  type Chat,
  type Messages,
} from "@/generated/prisma/client";
import { chatModel } from "@/lib/openai";
import { ChatRepository } from "@/repositories/chat.repository";
import { TitleService } from "@/services/title.service";
import { getMessageText, toUIMessage, toUIMessages } from "@/utils/ui-message";
import type {
  ListChatQuery,
  SendMessageInput,
  UpdateChatInput,
} from "@/validators/chat";
import {
  convertToModelMessages,
  createUIMessageStream,
  pipeUIMessageStreamToResponse,
  streamText,
  toUIMessageStream,
} from "ai";
import type { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { randomUUID } from "node:crypto";

const DEFAULT_TITLE = "New chat";
const HISTORY_LIMIT = 50;
const UNIQUE_CONSTRAINT_FAILED = "P2002";
const SYSTEM_PROMPT =
  "You are a helpful assistant for developers who want to understand and work with code repositories. Answer clearly and concisely, and use markdown for code.";

export abstract class ChatService {
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

  // The client picks the chat id; the chat is created on its first message.
  static async stream(
    id: string,
    userId: string,
    input: SendMessageInput,
    res: Response,
  ) {
    const text = input.message.parts.map((part) => part.text).join("\n");

    let history: Messages[] = [];
    let userRecord = await ChatService.createIfMissing(id, userId, text);
    if (!userRecord) {
      await ChatService.getOwned(id, userId);
      history = await ChatRepository.getMessages(id, HISTORY_LIMIT);
      userRecord = await ChatRepository.addMessage({
        chatId: id,
        role: ChatRole.USER,
        message: text,
      });
    }

    const titlePromise =
      history.length === 0 ? ChatService.generateTitle(id, text) : null;

    const messages = [...toUIMessages(history), toUIMessage(userRecord)!];

    const result = streamText({
      model: chatModel,
      instructions: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
    });

    // Run the model to completion so the reply is saved even if the client disconnects.
    void result.consumeStream();

    const onError = (error: unknown) => {
      logger.error({ chatId: id, error });
      return CHAT_MESSAGES.STREAM_FAILED;
    };

    await pipeUIMessageStreamToResponse({
      response: res,
      stream: createUIMessageStream({
        onError,
        execute: async ({ writer }) => {
          writer.merge(
            toUIMessageStream({
              stream: result.stream,
              originalMessages: messages,
              generateMessageId: randomUUID,
              onError,
              onEnd: async ({ messages: finalMessages }) => {
                try {
                  const reply = finalMessages.at(-1);
                  if (reply?.role !== "assistant") return;
                  const replyText = getMessageText(reply);
                  if (!replyText) return;
                  await ChatRepository.addMessage({
                    id: reply.id,
                    chatId: id,
                    role: ChatRole.ASSISTANT,
                    message: replyText,
                  });
                } catch (error) {
                  logger.error({ chatId: id, error });
                }
              },
            }),
          );

          // Keeps the stream open until the sidebar title is sent.
          const title = await titlePromise;
          if (title) {
            writer.write({
              type: "data-chat-title",
              data: { chatId: id, title },
              transient: true,
            });
          }
        },
      }),
    });
  }

  // Returns the saved user message if the chat was created, or null if it already exists.
  private static async createIfMissing(
    id: string,
    userId: string,
    message: string,
  ): Promise<Messages | null> {
    if (await ChatRepository.findById(id)) return null;
    try {
      return await ChatRepository.createWithMessage({
        id,
        userId,
        title: DEFAULT_TITLE,
        message,
      });
    } catch (error) {
      // Another request created the same chat first.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_FAILED
      ) {
        return null;
      }
      throw error;
    }
  }

  private static async generateTitle(
    id: string,
    message: string,
  ): Promise<string | null> {
    const title = await TitleService.generate(message);
    try {
      await ChatRepository.setTitle(id, title);
      return title;
    } catch (error) {
      logger.error({ chatId: id, error }, "failed to save chat title");
      return null;
    }
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
