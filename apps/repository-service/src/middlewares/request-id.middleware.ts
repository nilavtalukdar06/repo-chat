import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestId = randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-header", requestId);
  next();
}
