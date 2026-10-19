import { REPO_MESSAGES } from "@/constants/repository.messages";
import { sendResponse } from "@/core/response";
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
    sendResponse(
      res,
      StatusCodes.UNAUTHORIZED,
      REPO_MESSAGES.AUTHENTICATION_REQUIRED,
    );
    return;
  }

  req.userId = userId;
  next();
};
