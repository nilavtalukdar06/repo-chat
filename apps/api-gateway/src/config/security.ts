import compression from "compression";
import helmet from "helmet";
import type { RequestHandler } from "express";
import { env } from "./env";

export const securityMiddleware: RequestHandler[] = [
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: env.FRONTEND_DIR ? false : undefined,
  }),
  compression({
    filter: (req, res) =>
      !String(res.getHeader("Content-Type")).startsWith("text/event-stream") &&
      compression.filter(req, res),
  }),
];
