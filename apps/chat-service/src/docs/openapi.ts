import { env } from "@/config/env";

function apiResponse(dataSchema?: Record<string, unknown>) {
  return {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      statusCode: { type: "integer", example: 200 },
      message: { type: "string" },
      ...(dataSchema ? { data: dataSchema } : {}),
      meta: { type: "object", nullable: true },
    },
    required: ["success", "statusCode", "message"],
  };
}

const healthDataSchema = {
  type: "object",
  properties: {
    uptime: { type: "number", example: 123.45 },
    timestamp: { type: "string", format: "date-time" },
    services: {
      type: "object",
      properties: {
        database: { type: "boolean" },
      },
    },
  },
} as const;

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Chat Service API",
    description:
      "Owns chat conversations over indexed repositories. Sits behind the API gateway, which resolves the caller's identity and forwards it as the x-user-id header rather than a session cookie.",
    version: "1.0.0",
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}`,
      description: "Local server",
    },
  ],
  tags: [{ name: "Health", description: "Liveness and readiness probes" }],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Liveness check",
        description: "Reports whether the service and Postgres are reachable.",
        responses: {
          "200": {
            description: "Service is healthy",
            content: {
              "application/json": { schema: apiResponse(healthDataSchema) },
            },
          },
          "503": {
            description: "Service is unhealthy (Postgres unreachable)",
            content: {
              "application/json": { schema: apiResponse(healthDataSchema) },
            },
          },
        },
      },
    },
    "/ready": {
      get: {
        tags: ["Health"],
        summary: "Readiness check",
        responses: {
          "200": {
            description: "Service is ready to accept traffic",
            content: {
              "application/json": { schema: apiResponse() },
            },
          },
        },
      },
    },
  },
};
