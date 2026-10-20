import { isDatabaseHealthy } from "@/lib/prisma";
import { sendResponse } from "@/core/response";
import { Router, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";

const router: Router = Router();

router.get("/health", async (_req: Request, res: Response) => {
  const database = await isDatabaseHealthy();

  sendResponse(
    res,
    database ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE,
    database ? "server is healthy" : "server is unhealthy",
    {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: { database },
    },
  );
});

router.get("/ready", (_req: Request, res: Response) => {
  sendResponse(res, StatusCodes.OK, "server is ready");
});

export default router;
