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
            "Present when message is 'validation failed' — the flattened Zod error.",
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

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Auth Service API",
    description:
      "Session-cookie based authentication service: registration, login, logout and the current user's profile.",
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
      description: "Registration, session login/logout and profile",
    },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "connect.sid",
        description:
          "Session cookie issued by POST /api/auth/login. Stored server-side in Redis.",
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
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Liveness check",
        description:
          "Reports whether the service, Postgres and Redis dependencies are reachable.",
        responses: {
          "200": {
            description: "Service is healthy",
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
                        postgres: { type: "boolean" },
                        redis: { type: "boolean" },
                      },
                    },
                  },
                }),
              },
            },
          },
          "503": {
            description: "Service is unhealthy (Postgres or Redis unreachable)",
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
                        postgres: { type: "boolean" },
                        redis: { type: "boolean" },
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
            description: "Service is ready to accept traffic",
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
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in and start a session",
        description:
          "On success, sets an httpOnly `connect.sid` session cookie used to authenticate subsequent requests.",
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
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Log out and destroy the session",
        description:
          "Destroys the server-side session and clears the session cookie.",
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
          "429": { $ref: "#/components/responses/TooManyRequests" },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get the current authenticated user's profile",
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
        },
      },
    },
  },
} as const;
