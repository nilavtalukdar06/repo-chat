import { env } from "./env";

export const services = {
  auth: {
    name: "auth-service",
    baseUrl: env.AUTH_SERVICE_URL,
    healthPath: "/health",
  },
  repository: {
    name: "repository-service",
    baseUrl: env.REPOSITORY_SERVICE_URL,
    healthPath: "/health",
  },
} as const;
