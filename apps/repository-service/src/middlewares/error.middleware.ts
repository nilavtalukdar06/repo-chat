import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { ApiError } from "@/core/api-error";
import { sendErrorResponse } from "@/core/response";
import type { ErrorRequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import { ZodError } from "zod";

const isDev = env.NODE_ENV === "development";

export const errorMiddleware: ErrorRequestHandler = (
  error,
  req,
  res,
  _next,
) => {
  logger.error({
    requestId: req.requestId,
    error,
  });

  if (error instanceof ZodError) {
    return sendErrorResponse(
      res,
      StatusCodes.BAD_REQUEST,
      "validation failed",
      error.flatten(),
    );
  }

  if (error instanceof ApiError) {
    return sendErrorResponse(
      res,
      error.statusCode,
      error.message,
      error.errors,
    );
  }

  return sendErrorResponse(
    res,
    StatusCodes.INTERNAL_SERVER_ERROR,
    "internal server error",
    undefined,
    isDev ? { stack: error.stack } : undefined,
  );
};
