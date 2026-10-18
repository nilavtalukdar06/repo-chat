import { sendResponse } from "@/core/response";
import { prisma } from "@/lib/prisma";
import { isRedisReady } from "@/lib/redis";
import { Router, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";

const router: Router = Router();

router.get("/health", async (_req: Request, res: Response) => {
  const checks = {
    postgres: false,
    redis: isRedisReady(),
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.postgres = true;
  } catch {
    checks.postgres = false;
  }

  const isHealthy = checks.postgres && checks.redis;

  sendResponse(
    res,
    isHealthy ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE,
    isHealthy ? "server is healthy" : "server is unhealthy",
    {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks,
    },
  );
});

router.get("/ready", (_req: Request, res: Response) => {
  sendResponse(res, StatusCodes.OK, "server is ready");
});

export default router;
