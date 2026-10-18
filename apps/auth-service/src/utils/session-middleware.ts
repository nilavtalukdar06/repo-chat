import type { CookieOptions, RequestHandler } from "express";
import session from "express-session";
import { RedisStore } from "connect-redis";
import { env } from "@/config/env";
import { redis } from "@/lib/redis";

const isProduction = env.NODE_ENV === "production";

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export const SESSION_COOKIE_NAME = "connect.sid";

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
};

export const sessionMiddleware: RequestHandler = session({
  name: SESSION_COOKIE_NAME,
  store: new RedisStore({
    client: redis,
    prefix: "session:",
    ttl: SESSION_TTL_SECONDS,
  }),
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    ...sessionCookieOptions,
    maxAge: SESSION_TTL_SECONDS * 1000,
  },
});
