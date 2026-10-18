import { AUTH_MESSAGES } from "@/constants/auth.messages";
import { sendResponse } from "@/core/response";
import { clearSessionCookie, deleteSession } from "@/utils/session-utils";
import { getUserProfile } from "@/utils/user-profile";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const requireAuth: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      sendResponse(
        res,
        StatusCodes.UNAUTHORIZED,
        AUTH_MESSAGES.AUTHENTICATION_REQUIRED,
      );
      return;
    }

    const user = await getUserProfile(userId);
    if (!user) {
      await deleteSession(req);
      clearSessionCookie(res);
      sendResponse(
        res,
        StatusCodes.UNAUTHORIZED,
        AUTH_MESSAGES.SESSION_EXPIRED,
      );
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
