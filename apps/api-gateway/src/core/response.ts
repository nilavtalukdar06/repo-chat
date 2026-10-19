import type { Response } from "express";
import { ApiResponse } from "./api-response";

export function sendResponse<T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
) {
  return res.status(statusCode).json(
    new ApiResponse({
      statusCode,
      message,
      data,
    }),
  );
}

export function sendErrorResponse(
  res: Response,
  statusCode: number,
  message: string,
  errors?: unknown,
  extra?: Record<string, unknown>,
) {
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
    ...extra,
  });
}
