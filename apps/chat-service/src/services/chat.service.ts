import { logger } from "@/config/logger";
import { CHAT_MESSAGES } from "@/constants/chat.messages";
import { answerPrompt } from "@/constants/prompts";
import { ApiError } from "@/core/api-error";
import {
  ChatRole,
  Prisma,
  type Chat,
  type Messages,
} from "@/generated/prisma/client";
import { chatModel } from "@/lib/openai";
import { ChatRepository } from "@/repositories/chat.repository";
import { RagService, withContext } from "@/services/rag.service";
import { RepositoryService } from "@/services/repository.service";
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
  type UIMessage,
  type UIMessageStreamWriter,
} from "ai";
import type { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { randomUUID } from "node:crypto";

const DEFAULT_TITLE = "New chat";
const HISTORY_LIMIT = 50;
const UNIQUE_CONSTRAINT_FAILED = "P2002";

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

  static async stream(
    id: string,
    userId: string,
    input: SendMessageInput,
    res: Response,
  ) {
    const { repositoryId } = input;
    const text = input.message.parts.map((part) => part.text).join("\n");
    const repository = await RepositoryService.getIndexed(repositoryId, userId);
    let history: Messages[] = [];
    let userRecord = await ChatService.createIfMissing(
      id,
      userId,
      repositoryId,
      text,
    );
    if (!userRecord) {
      const chat = await ChatService.getOwned(id, userId);
      if (chat.repositoryId !== repositoryId) {
        throw new ApiError({
          statusCode: StatusCodes.NOT_FOUND,
          message: CHAT_MESSAGES.NOT_FOUND,
        });
      }
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
    const onError = (error: unknown) => {
      logger.error({ chatId: id, error });
      return CHAT_MESSAGES.STREAM_FAILED;
    };
    await pipeUIMessageStreamToResponse({
      response: res,
      stream: createUIMessageStream({
        onError,
        execute: async ({ writer }) => {
          const writeStatus = (stage: string) =>
            writer.write({
              type: "data-status",
              data: { stage },
              transient: true,
            });
          const retrieval = await RagService.retrieve(
            { question: text, history, repository, userId },
            writeStatus,
          );
          if (retrieval.strategy === "off_topic") {
            await ChatService.replyOffTopic(id, writer);
          } else {
            writer.write({
              type: "data-sources",
              data: retrieval.chunks.map((chunk) => ({
                path: chunk.filePath,
                startLine: chunk.startLine,
                endLine: chunk.endLine,
                language: chunk.language,
                score: chunk.score,
              })),
              transient: true,
            });
            writeStatus("generating");
            const lastMessage: UIMessage = {
              ...messages.at(-1)!,
              parts: [
                { type: "text", text: withContext(text, retrieval.chunks) },
              ],
            };
            const result = streamText({
              model: chatModel,
              instructions: answerPrompt(repository),
              messages: await convertToModelMessages([
                ...messages.slice(0, -1),
                lastMessage,
              ]),
            });
            void result.consumeStream();
            writer.merge(
              toUIMessageStream({
                stream: result.stream,
                originalMessages: messages,
                generateMessageId: randomUUID,
                onError,
                onEnd: async ({ messages: finalMessages }) => {
                  const reply = finalMessages.at(-1);
                  if (reply?.role !== "assistant") return;
                  await ChatService.saveReply(
                    id,
                    reply.id,
                    getMessageText(reply),
                  );
                },
              }),
            );
          }
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
  private static async replyOffTopic(
    chatId: string,
    writer: UIMessageStreamWriter,
  ) {
    const messageId = randomUUID();
    const textId = randomUUID();
    writer.write({ type: "start", messageId });
    writer.write({ type: "text-start", id: textId });
    writer.write({
      type: "text-delta",
      id: textId,
      delta: CHAT_MESSAGES.OFF_TOPIC_REPLY,
    });
    writer.write({ type: "text-end", id: textId });
    writer.write({ type: "finish" });
    await ChatService.saveReply(
      chatId,
      messageId,
      CHAT_MESSAGES.OFF_TOPIC_REPLY,
    );
  }
  private static async saveReply(chatId: string, id: string, text: string) {
    if (!text) return;
    try {
      await ChatRepository.addMessage({
        id,
        chatId,
        role: ChatRole.ASSISTANT,
        message: text,
      });
    } catch (error) {
      logger.error({ chatId, error }, "failed to save assistant reply");
    }
  }
  private static async createIfMissing(
    id: string,
    userId: string,
    repositoryId: string,
    message: string,
  ): Promise<Messages | null> {
    if (await ChatRepository.findById(id)) return null;
    try {
      return await ChatRepository.createWithMessage({
        id,
        userId,
        repositoryId,
        title: DEFAULT_TITLE,
        message,
      });
    } catch (error) {
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
