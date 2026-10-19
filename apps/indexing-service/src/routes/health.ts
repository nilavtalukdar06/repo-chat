import { sendResponse } from "@/core/response";
import { Router, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";

const router: Router = Router();

router.get("/health", (_req: Request, res: Response) => {
  sendResponse(res, StatusCodes.OK, "server is healthy", {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.get("/ready", (_req: Request, res: Response) => {
  sendResponse(res, StatusCodes.OK, "server is ready");
});

export default router;
