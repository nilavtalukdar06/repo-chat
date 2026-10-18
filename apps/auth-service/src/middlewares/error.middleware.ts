import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { ApiError } from "@/core/api-error";
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
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      statusCode: StatusCodes.BAD_REQUEST,
      message: "validation failed",
      errors: error.flatten(),
    });
  }
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      statusCode: error.statusCode,
      message: error.message,
      errors: error.errors,
    });
  }
  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    message: "internal server error",
    ...(isDev && {
      stack: error.stack,
    }),
  });
};
