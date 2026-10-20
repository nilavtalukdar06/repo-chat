import compression from "compression";
import helmet from "helmet";
import type { RequestHandler } from "express";

export const securityMiddleware: RequestHandler[] = [
  helmet({
    crossOriginResourcePolicy: false,
  }),
  compression(),
];
