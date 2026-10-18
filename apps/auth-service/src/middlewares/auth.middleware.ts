import { env } from "@/config/env";
import { sendResponse } from "@/core/response";
import { AuthUser } from "@/types/express";
import { getUserProfile } from "@/utils/user-profile";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const requireAuth: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.session?.userId as string;
    if (!userId) {
      sendResponse(
        res,
        StatusCodes.UNAUTHORIZED,
        "the user is not authenticated",
      );
    }
    const user = await getUserProfile(userId);
    if (!user) {
      await new Promise<void>((resolve, reject) => {
        req.session.destroy((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      res.clearCookie("connect.sid", {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
      sendResponse(res, StatusCodes.UNAUTHORIZED, "session user not found");
    }
    req.user = user as AuthUser;
    next();
  } catch (error) {
    next(error);
  }
};
