import { logger } from "@/config/logger";
import type { Request as ExpressRequest, RequestHandler } from "express";
import { createProxyMiddleware, type Options } from "http-proxy-middleware";
import { StatusCodes } from "http-status-codes";

export function createServiceProxy(
  serviceName: string,
  target: string,
  pathFilter: string[],
): RequestHandler {
  const options: Options = {
    target,
    changeOrigin: true,
    pathFilter,
    on: {
      proxyReq: (proxyReq, req) => {
        const expressReq = req as ExpressRequest;
        if (expressReq.requestId) {
          proxyReq.setHeader("x-request-id", expressReq.requestId);
        }
        if (expressReq.user) {
          proxyReq.setHeader("x-user-id", expressReq.user.id);
          proxyReq.setHeader("x-user-email", expressReq.user.email);
        }
      },
      error: (error, req, res) => {
        const expressReq = req as ExpressRequest;
        logger.error(
          { requestId: expressReq.requestId, error, service: serviceName },
          `failed to proxy request to ${serviceName}`,
        );
        if ("writeHead" in res && !res.headersSent) {
          res.writeHead(StatusCodes.BAD_GATEWAY, {
            "Content-Type": "application/json",
          });
          res.end(
            JSON.stringify({
              success: false,
              statusCode: StatusCodes.BAD_GATEWAY,
              message: `${serviceName} is unavailable`,
              errors: [],
            }),
          );
        }
      },
    },
  };

  return createProxyMiddleware(options);
}
