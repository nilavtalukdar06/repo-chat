import { CHAT_MESSAGES } from "@/constants/chat.messages";
import { sendErrorResponse } from "@/core/response";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { StatusCodes } from "http-status-codes";

const USER_ID_HEADER = "x-user-id";

export const requireUserId: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.headers[USER_ID_HEADER];

  if (!userId || typeof userId !== "string") {
    sendErrorResponse(
      res,
      StatusCodes.UNAUTHORIZED,
      CHAT_MESSAGES.AUTHENTICATION_REQUIRED,
    );
    return;
  }

  req.userId = userId;
  next();
};
