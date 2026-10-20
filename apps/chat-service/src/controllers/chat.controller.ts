import { CHAT_MESSAGES } from "@/constants/chat.messages";
import { asyncHandler } from "@/core/async-handler";
import { sendResponse } from "@/core/response";
import { ChatService } from "@/services/chat.service";
import type {
  ChatIdParams,
  ListChatQuery,
  SendMessageInput,
  UpdateChatInput,
} from "@/validators/chat";
import type { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";

export abstract class ChatController {
  static get: RequestHandler = asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as ChatIdParams;
    const chat = await ChatService.get(id, req.userId!);
    sendResponse(res, StatusCodes.OK, CHAT_MESSAGES.FETCH_SUCCESS, chat);
  });

  static getAll: RequestHandler = asyncHandler(async (req, res) => {
    const { data, meta } = await ChatService.getAll(
      req.userId!,
      req.query as unknown as ListChatQuery,
    );
    sendResponse(
      res,
      StatusCodes.OK,
      CHAT_MESSAGES.LIST_FETCH_SUCCESS,
      data,
      meta,
    );
  });

  static update: RequestHandler = asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as ChatIdParams;
    const chat = await ChatService.update(
      id,
      req.userId!,
      req.body as UpdateChatInput,
    );
    sendResponse(res, StatusCodes.OK, CHAT_MESSAGES.UPDATE_SUCCESS, chat);
  });

  static delete: RequestHandler = asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as ChatIdParams;
    await ChatService.delete(id, req.userId!);
    sendResponse(res, StatusCodes.OK, CHAT_MESSAGES.DELETE_SUCCESS);
  });

  static sendMessage: RequestHandler = asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as ChatIdParams;
    await ChatService.stream(
      id,
      req.userId!,
      req.body as SendMessageInput,
      res,
    );
  });
}
