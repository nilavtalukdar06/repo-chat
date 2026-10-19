import { env } from "@/config/env";

const authUserSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string", example: "Ada Lovelace" },
    email: { type: "string", format: "email", example: "ada@example.com" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
  required: ["id", "name", "email", "createdAt", "updatedAt"],
} as const;

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

const apiErrorResponse = {
  type: "object",
  properties: {
    success: { type: "boolean", example: false },
    statusCode: { type: "integer", example: 400 },
    message: { type: "string" },
    errors: {
      nullable: true,
      oneOf: [
        { type: "array", items: {} },
        {
          type: "object",
          description:
            "Present when message is 'validation failed' — the flattened Zod error forwarded from the upstream service.",
          properties: {
            formErrors: { type: "array", items: { type: "string" } },
            fieldErrors: {
              type: "object",
              additionalProperties: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
        },
      ],
    },
  },
  required: ["success", "statusCode", "message"],
};

const tooManyRequestsResponse = {
  description: "Rate limit exceeded",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: {
            type: "string",
            example: "Too many requests, please try again later.",
          },
        },
      },
    },
  },
};

const badGatewayResponse = {
  description: "The upstream service could not be reached",
  content: {
    "application/json": {
      schema: apiErrorResponse,
      example: {
        success: false,
        statusCode: 502,
        message: "auth-service is unavailable",
        errors: [],
      },
    },
  },
};

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "API Gateway",
    description:
      "Single public entry point for the platform. Terminates client traffic, enforces session authentication on protected routes, and reverse-proxies everything else to the auth-service and indexing-service. The gateway does not own any business data itself — request/response bodies on proxied routes are defined by the upstream service.",
    version: "1.0.0",
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}`,
      description: "Local server",
    },
  ],
  tags: [
    { name: "Health", description: "Liveness and readiness probes" },
    {
      name: "Auth",
      description:
        "Proxied through to the auth-service at /api/auth. Session-protected routes are enforced by the gateway before the request is forwarded.",
    },
    {
      name: "Indexing",
      description:
        "Reserved for the indexing-service at /api/indexing. All requests under this prefix require a valid session. The indexing-service currently only implements its own health checks and does not yet expose any routes under this prefix.",
    },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "connect.sid",
        description:
          "Session cookie issued by the auth-service's POST /api/auth/login. On protected routes the gateway validates it against the auth-service before proxying the request, and forwards the resolved identity to the upstream service as x-user-id / x-user-email headers.",
      },
    },
    schemas: {
      AuthUser: authUserSchema,
      ApiErrorResponse: apiErrorResponse,
    },
    responses: {
      ValidationError: {
        description: "Request body failed schema validation",
        content: {
          "application/json": {
            schema: apiErrorResponse,
            example: {
              success: false,
              statusCode: 400,
              message: "validation failed",
              errors: {
                formErrors: [],
                fieldErrors: {
                  email: ["please provide a valid email address"],
                },
              },
            },
          },
        },
      },
      Unauthorized: {
        description: "Missing, invalid or expired session",
        content: {
          "application/json": {
            schema: apiErrorResponse,
            example: {
              success: false,
              statusCode: 401,
              message: "authentication is required to access this resource",
              errors: [],
            },
          },
        },
      },
      TooManyRequests: tooManyRequestsResponse,
      BadGateway: badGatewayResponse,
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Liveness check",
        description:
          "Reports the gateway's own liveness along with the health of the auth-service and indexing-service it depends on.",
        responses: {
          "200": {
            description: "Gateway and all upstream services are healthy",
            content: {
              "application/json": {
                schema: apiResponse({
                  type: "object",
                  properties: {
                    uptime: { type: "number", example: 123.45 },
                    timestamp: { type: "string", format: "date-time" },
                    checks: {
                      type: "object",
                      properties: {
                        authService: { type: "boolean" },
                        indexingService: { type: "boolean" },
                      },
                    },
                  },
                }),
              },
            },
          },
          "503": {
            description:
              "Gateway is degraded (at least one upstream service is unreachable)",
            content: {
              "application/json": {
                schema: apiResponse({
                  type: "object",
                  properties: {
                    uptime: { type: "number" },
                    timestamp: { type: "string", format: "date-time" },
                    checks: {
                      type: "object",
                      properties: {
                        authService: { type: "boolean" },
                        indexingService: { type: "boolean" },
                      },
                    },
                  },
                }),
              },
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
            description: "Gateway is ready to accept traffic",
            content: {
              "application/json": { schema: apiResponse() },
            },
          },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        description: "Proxied to the auth-service without session enforcement.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    minLength: 2,
                    example: "Ada Lovelace",
                  },
                  email: {
                    type: "string",
                    format: "email",
                    example: "ada@example.com",
                  },
                  password: {
                    type: "string",
                    minLength: 8,
                    format: "password",
                  },
                },
                required: ["name", "email", "password"],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "User registered successfully",
            content: {
              "application/json": {
                schema: apiResponse(),
                example: {
                  success: true,
                  statusCode: 201,
                  message: "user registered successfully",
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "409": {
            description: "A user with this email already exists",
            content: {
              "application/json": {
                schema: apiErrorResponse,
                example: {
                  success: false,
                  statusCode: 409,
                  message: "a user with this email already exists",
                  errors: [],
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "502": { $ref: "#/components/responses/BadGateway" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in and start a session",
        description:
          "Proxied to the auth-service without session enforcement. On success, sets an httpOnly `connect.sid` session cookie used to authenticate subsequent requests through the gateway.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    example: "ada@example.com",
                  },
                  password: {
                    type: "string",
                    minLength: 1,
                    format: "password",
                  },
                },
                required: ["email", "password"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Logged in successfully",
            headers: {
              "Set-Cookie": {
                schema: {
                  type: "string",
                  example: "connect.sid=s%3A...; Path=/; HttpOnly",
                },
              },
            },
            content: {
              "application/json": {
                schema: apiResponse({ $ref: "#/components/schemas/AuthUser" }),
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": {
            description: "Invalid email or password",
            content: {
              "application/json": {
                schema: apiErrorResponse,
                example: {
                  success: false,
                  statusCode: 401,
                  message: "invalid email or password",
                  errors: [],
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "502": { $ref: "#/components/responses/BadGateway" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Log out and destroy the session",
        description:
          "Requires a valid session cookie. The gateway validates the session against the auth-service before proxying the request, which destroys the server-side session and clears the session cookie.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Logged out successfully",
            content: {
              "application/json": {
                schema: apiResponse(),
                example: {
                  success: true,
                  statusCode: 200,
                  message: "user logged out successfully",
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "502": { $ref: "#/components/responses/BadGateway" },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get the current authenticated user's profile",
        description: "Requires a valid session cookie.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Current user profile",
            content: {
              "application/json": {
                schema: apiResponse({ $ref: "#/components/schemas/AuthUser" }),
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "502": { $ref: "#/components/responses/BadGateway" },
        },
      },
    },
    "/api/auth/validate": {
      get: {
        tags: ["Auth"],
        summary: "Validate a session",
        description:
          "Requires a valid session cookie. Primarily used internally by the gateway itself to resolve the caller's identity before proxying protected routes; exposed here as a thin passthrough to the same auth-service endpoint.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Session is valid",
            content: {
              "application/json": {
                schema: apiResponse({
                  type: "object",
                  properties: {
                    userId: { type: "string", format: "uuid" },
                    user: { $ref: "#/components/schemas/AuthUser" },
                  },
                  required: ["userId", "user"],
                }),
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "502": { $ref: "#/components/responses/BadGateway" },
        },
      },
    },
  },
} as const;
