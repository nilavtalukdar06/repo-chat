import type { RequestHandler } from "express";
import session from "express-session";
import { RedisStore } from "connect-redis";
import { env } from "@/config/env";
import { redis } from "@/lib/redis";

const isProduction = env.NODE_ENV === "production";

export const sessionMiddleware: RequestHandler = session({
  name: "connect.sid",
  store: new RedisStore({
    client: redis,
    prefix: "session:",
    ttl: 7 * 24 * 60 * 60,
  }),
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  },
});
