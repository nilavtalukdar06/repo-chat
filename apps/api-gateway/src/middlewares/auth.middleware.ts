import { env } from "@/config/env";
import { ApiError } from "@/core/api-error";
import { asyncHandler } from "@/core/async-handler";
import { sendResponse } from "@/core/response";
import type { GatewayUser } from "@/types/express";
import type { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";

const SESSION_COOKIE_NAME = "connect.sid";

interface ValidateSessionResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data?: { userId: string; user: GatewayUser };
}

export const requireSession: RequestHandler = asyncHandler(
  async (req, res, next) => {
    const cookieHeader = req.headers.cookie;
    const hasSessionCookie = cookieHeader?.includes(`${SESSION_COOKIE_NAME}=`);

    if (!hasSessionCookie) {
      sendResponse(
        res,
        StatusCodes.UNAUTHORIZED,
        "authentication is required to access this resource",
      );
      return;
    }

    let authResponse: globalThis.Response;
    try {
      authResponse = await fetch(`${env.AUTH_SERVICE_URL}/api/auth/validate`, {
        headers: { cookie: cookieHeader! },
        signal: AbortSignal.timeout(env.SERVICE_REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new ApiError({
        statusCode: StatusCodes.BAD_GATEWAY,
        message: "unable to reach auth service to validate session",
        cause: error,
      });
    }

    const body = (await authResponse.json()) as ValidateSessionResponse;

    if (!authResponse.ok || !body.data) {
      sendResponse(
        res,
        StatusCodes.UNAUTHORIZED,
        body.message || "session has expired, please log in again",
      );
      return;
    }

    req.user = body.data.user;
    next();
  },
);
