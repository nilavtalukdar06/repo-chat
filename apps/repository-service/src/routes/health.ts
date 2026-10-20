import { isClickhouseHealthy } from "@/logs/clickhouse";
import { isKafkaHealthy } from "@/logs/kafka-consumer";
import { isDatabaseHealthy } from "@/lib/prisma";
import { sendResponse } from "@/core/response";
import { Router, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";

const router: Router = Router();

router.get("/health", async (_req: Request, res: Response) => {
  const [kafka, clickhouse, database] = await Promise.all([
    isKafkaHealthy(),
    isClickhouseHealthy(),
    isDatabaseHealthy(),
  ]);

  const services = { kafka, clickhouse, database };
  const isHealthy = kafka && clickhouse && database;

  sendResponse(
    res,
    isHealthy ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE,
    isHealthy ? "server is healthy" : "server is unhealthy",
    {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services,
    },
  );
});

router.get("/ready", (_req: Request, res: Response) => {
  sendResponse(res, StatusCodes.OK, "server is ready");
});

export default router;
