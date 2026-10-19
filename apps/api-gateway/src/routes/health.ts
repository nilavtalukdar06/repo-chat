import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { services } from "@/config/services";
import { sendResponse } from "@/core/response";
import axios from "axios";
import { Router, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";

const router: Router = Router();

async function checkServiceHealth(
  service: (typeof services)[keyof typeof services],
): Promise<boolean> {
  try {
    const response = await axios.get(
      `${service.baseUrl}${service.healthPath}`,
      {
        timeout: env.SERVICE_REQUEST_TIMEOUT_MS,
        validateStatus: () => true,
      },
    );
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    logger.warn(
      { service: service.name, error },
      `${service.name} health check failed`,
    );
    return false;
  }
}

router.get("/health", async (_req: Request, res: Response) => {
  const [authHealthy, repositoryHealthy] = await Promise.all([
    checkServiceHealth(services.auth),
    checkServiceHealth(services.repository),
  ]);

  const checks = {
    authService: authHealthy,
    repositoryService: repositoryHealthy,
  };
  const isHealthy = authHealthy && repositoryHealthy;

  sendResponse(
    res,
    isHealthy ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE,
    isHealthy ? "api gateway is healthy" : "api gateway is degraded",
    {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks,
    },
  );
});

router.get("/ready", (_req: Request, res: Response) => {
  sendResponse(res, StatusCodes.OK, "api gateway is ready");
});

export default router;
