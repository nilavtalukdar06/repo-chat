import { env } from "./env";

export const services = {
  auth: {
    name: "auth-service",
    baseUrl: env.AUTH_SERVICE_URL,
    healthPath: "/health",
  },
  indexing: {
    name: "indexing-service",
    baseUrl: env.INDEXING_SERVICE_URL,
    healthPath: "/health",
  },
} as const;
