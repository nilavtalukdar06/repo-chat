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
