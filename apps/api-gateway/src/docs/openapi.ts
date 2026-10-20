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

const chatSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    title: { type: "string", example: "How does indexing work?" },
    userId: { type: "string" },
    repositoryId: { type: "string", format: "uuid" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
  required: ["id", "title", "userId", "repositoryId", "createdAt", "updatedAt"],
} as const;

const uiMessageSchema = {
  type: "object",
  description:
    "AI SDK UIMessage. Can be passed straight to useChat as an initial message.",
  properties: {
    id: { type: "string" },
    role: { type: "string", enum: ["user", "assistant", "system"] },
    parts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["text"] },
          text: { type: "string" },
        },
        required: ["type", "text"],
      },
    },
  },
  required: ["id", "role", "parts"],
} as const;

const chatIdParameter = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
} as const;

const repositorySchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string", example: "repo-chat" },
    description: {
      type: ["string", "null"],
      example: "Chat with your GitHub repositories.",
    },
    githubUrl: {
      type: "string",
      format: "uri",
      example: "https://github.com/octocat/hello-world",
    },
    stars: { type: "integer", example: 42 },
    language: { type: "string", example: "TypeScript" },
    status: {
      type: "string",
      enum: ["QUEUED", "INDEXING", "INDEXED", "FAILED"],
      description:
        "Chat is only available once the repository is INDEXED (409 otherwise).",
    },
    userId: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
  required: [
    "id",
    "name",
    "githubUrl",
    "stars",
    "language",
    "status",
    "userId",
    "createdAt",
    "updatedAt",
  ],
} as const;

const logEventSchema = {
  type: "object",
  properties: {
    event_id: { type: "string" },
    timestamp: { type: "string", format: "date-time" },
    repository_id: { type: "string", format: "uuid" },
    user_id: { type: "string" },
    log: { type: "string", example: "cloning repository..." },
    metadata: { type: ["string", "null"] },
  },
  required: [
    "event_id",
    "timestamp",
    "repository_id",
    "user_id",
    "log",
    "metadata",
  ],
} as const;

const repositoryNotFoundResponse = {
  description:
    "No repository with this id exists for the caller (repositories owned by other users are reported as not found)",
  content: {
    "application/json": {
      schema: apiErrorResponse,
      example: {
        success: false,
        statusCode: 404,
        message: "repository not found",
        errors: [],
      },
    },
  },
} as const;

const repositoryIdParameter = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
} as const;

const chatNotFoundResponse = {
  description: "Chat not found, or it belongs to another user",
  content: {
    "application/json": {
      schema: apiErrorResponse,
      example: {
        success: false,
        statusCode: 404,
        message: "chat not found",
        errors: [],
      },
    },
  },
} as const;

const chatTitleSchema = {
  type: "string",
  minLength: 1,
  maxLength: 100,
} as const;

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "API Gateway",
    description:
      "Single public entry point for the platform. Terminates client traffic, enforces session authentication on protected routes, and reverse-proxies everything else to the auth-service, repository-service and chat-service. The gateway is the only component that rate limits requests (per client IP, 429 when exceeded); the services behind it do not. The gateway does not own any business data itself — request/response bodies on proxied routes are defined by the upstream service.",
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
      name: "Repository",
      description:
        "Proxied through to the repository-service at /api/repository. All requests under this prefix require a valid session, and every repository is private to the user who registered it: another user's repository is reported as 404.",
    },
    {
      name: "Chat",
      description:
        "Proxied through to the chat-service at /api/chat. All requests under this prefix require a valid session; the gateway forwards the caller's identity as x-user-id. Chats are private to their owner — another user's chat id returns 404.",
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
      Repository: repositorySchema,
      LogEvent: logEventSchema,
      Chat: chatSchema,
      UIMessage: uiMessageSchema,
      ChatWithMessages: {
        type: "object",
        properties: {
          ...chatSchema.properties,
          messages: {
            type: "array",
            items: { $ref: "#/components/schemas/UIMessage" },
          },
        },
        required: [...chatSchema.required, "messages"],
      },
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
          "Reports the gateway's own liveness along with the health of the auth-service, repository-service and chat-service it depends on.",
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
                        repositoryService: { type: "boolean" },
                        chatService: { type: "boolean" },
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
                        repositoryService: { type: "boolean" },
                        chatService: { type: "boolean" },
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
    "/api/repository": {
      post: {
        tags: ["Repository"],
        summary: "Register a GitHub repository for indexing",
        description:
          "Requires a valid session cookie. Fetches the repository's metadata from GitHub, saves it with status QUEUED and starts an indexing task. Poll `GET /api/repository/{id}` (or read the logs) until `status` is INDEXED, then chat with it.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  githubUrl: {
                    type: "string",
                    format: "uri",
                    example: "https://github.com/octocat/hello-world",
                  },
                },
                required: ["githubUrl"],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Repository registered and queued for indexing",
            content: {
              "application/json": {
                schema: apiResponse({
                  $ref: "#/components/schemas/Repository",
                }),
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": {
            description: "No repository exists at this GitHub URL",
            content: {
              "application/json": {
                schema: apiErrorResponse,
                example: {
                  success: false,
                  statusCode: 404,
                  message: "github repository not found",
                  errors: [],
                },
              },
            },
          },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "502": {
            description:
              "GitHub or the indexing task could not be reached (the repository is marked FAILED if the task could not be started)",
            content: {
              "application/json": { schema: apiErrorResponse },
            },
          },
        },
      },
      get: {
        tags: ["Repository"],
        summary: "List the current user's repositories",
        description:
          "Requires a valid session cookie. Offset-paginated, newest first, optionally filtered by name or description.",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
          },
          {
            name: "search",
            in: "query",
            schema: { type: "string", maxLength: 100 },
          },
        ],
        responses: {
          "200": {
            description: "Repositories fetched",
            content: {
              "application/json": {
                schema: {
                  ...apiResponse({
                    type: "array",
                    items: { $ref: "#/components/schemas/Repository" },
                  }),
                  properties: {
                    ...apiResponse().properties,
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Repository" },
                    },
                    meta: {
                      type: "object",
                      properties: {
                        total: { type: "integer" },
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        totalPages: { type: "integer" },
                        hasNextPage: { type: "boolean" },
                        hasPrevPage: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "502": { $ref: "#/components/responses/BadGateway" },
        },
      },
    },
    "/api/repository/{id}": {
      get: {
        tags: ["Repository"],
        summary: "Get a repository",
        description:
          "Requires a valid session cookie. Use it to open a repository's chat window and to poll `status` while indexing.",
        security: [{ cookieAuth: [] }],
        parameters: [repositoryIdParameter],
        responses: {
          "200": {
            description: "Repository fetched",
            content: {
              "application/json": {
                schema: apiResponse({
                  $ref: "#/components/schemas/Repository",
                }),
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": repositoryNotFoundResponse,
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "502": { $ref: "#/components/responses/BadGateway" },
        },
      },
      patch: {
        tags: ["Repository"],
        summary: "Update a repository's indexing status",
        description:
          "Requires a valid session cookie. Setting `status` to QUEUED re-runs indexing (use it to retry a FAILED repository); if the indexing task cannot be started the repository is marked FAILED and 502 is returned.",
        security: [{ cookieAuth: [] }],
        parameters: [repositoryIdParameter],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    enum: ["QUEUED", "INDEXING", "INDEXED", "FAILED"],
                  },
                },
                required: ["status"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Repository updated",
            content: {
              "application/json": {
                schema: apiResponse({
                  $ref: "#/components/schemas/Repository",
                }),
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": repositoryNotFoundResponse,
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "502": { $ref: "#/components/responses/BadGateway" },
        },
      },
      delete: {
        tags: ["Repository"],
        summary: "Delete a repository and everything derived from it",
        description:
          "Requires a valid session cookie. Rejected with 409 while the repository is still being indexed (status QUEUED or INDEXING) — wait for INDEXED or FAILED. Otherwise removes the caller's chats and messages about the repository, its indexing logs and its embedded code chunks, then the repository itself. The repository is deleted last, so if a cleanup step fails (502) it still exists and the request can be retried.",
        security: [{ cookieAuth: [] }],
        parameters: [repositoryIdParameter],
        responses: {
          "200": {
            description: "Repository deleted (returns the deleted repository)",
            content: {
              "application/json": {
                schema: apiResponse({
                  $ref: "#/components/schemas/Repository",
                }),
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": repositoryNotFoundResponse,
          "409": {
            description:
              "The repository is still being indexed (status QUEUED or INDEXING)",
            content: {
              "application/json": {
                schema: apiErrorResponse,
                example: {
                  success: false,
                  statusCode: 409,
                  message:
                    "repository is being indexed, wait for indexing to finish before deleting it",
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
    "/api/repository/{id}/logs": {
      get: {
        tags: ["Repository"],
        summary: "Get a repository's indexing logs",
        description:
          "Requires a valid session cookie. Log events emitted while the repository was indexed, oldest first.",
        security: [{ cookieAuth: [] }],
        parameters: [repositoryIdParameter],
        responses: {
          "200": {
            description: "Logs fetched",
            content: {
              "application/json": {
                schema: apiResponse({
                  type: "array",
                  items: { $ref: "#/components/schemas/LogEvent" },
                }),
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": repositoryNotFoundResponse,
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "502": { $ref: "#/components/responses/BadGateway" },
        },
      },
    },
    "/api/chat": {
      get: {
        tags: ["Chat"],
        summary: "List the current user's chats about a repository",
        description:
          "Requires a valid session cookie. Returns only chats about `repositoryId` (the chat sidebar of a repository's chat window). Cursor-paginated for infinite scrolling: omit `cursor` for the first page, then pass the previous page's `meta.nextCursor` until `meta.hasNextPage` is false. Ordered by most recent activity first, so a chat that receives a new message moves to the top. There is no create endpoint — a chat is created by its first message (see POST /api/chat/{id}/messages).",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "repositoryId",
            in: "query",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 50, default: 20 },
          },
          {
            name: "cursor",
            in: "query",
            description:
              "Opaque cursor from the previous page's meta.nextCursor.",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Chats fetched",
            content: {
              "application/json": {
                schema: {
                  ...apiResponse({
                    type: "array",
                    items: { $ref: "#/components/schemas/Chat" },
                  }),
                  properties: {
                    ...apiResponse().properties,
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Chat" },
                    },
                    meta: {
                      type: "object",
                      properties: {
                        nextCursor: {
                          type: ["string", "null"],
                          description: "Pass as `cursor` to get the next page.",
                        },
                        hasNextPage: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "502": { $ref: "#/components/responses/BadGateway" },
        },
      },
      delete: {
        tags: ["Chat"],
        summary: "Delete all of the current user's chats about a repository",
        description:
          'Requires a valid session cookie. Deletes every chat and message the caller has about `repositoryId` ("clear history"). Deleting a repository does this automatically.',
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "repositoryId",
            in: "query",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Chats deleted",
            content: {
              "application/json": {
                schema: apiResponse({
                  type: "object",
                  properties: {
                    deleted: { type: "integer", example: 3 },
                  },
                }),
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "502": { $ref: "#/components/responses/BadGateway" },
        },
      },
    },
    "/api/chat/{id}": {
      get: {
        tags: ["Chat"],
        summary: "Get a chat with its messages",
        description:
          "Requires a valid session cookie. Messages are returned oldest first as AI SDK UI messages.",
        security: [{ cookieAuth: [] }],
        parameters: [chatIdParameter],
        responses: {
          "200": {
            description: "Chat fetched",
            content: {
              "application/json": {
                schema: apiResponse({
                  $ref: "#/components/schemas/ChatWithMessages",
                }),
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": chatNotFoundResponse,
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "502": { $ref: "#/components/responses/BadGateway" },
        },
      },
      patch: {
        tags: ["Chat"],
        summary: "Rename a chat",
        description: "Requires a valid session cookie.",
        security: [{ cookieAuth: [] }],
        parameters: [chatIdParameter],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { title: chatTitleSchema },
                required: ["title"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Chat updated",
            content: {
              "application/json": {
                schema: apiResponse({ $ref: "#/components/schemas/Chat" }),
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": chatNotFoundResponse,
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "502": { $ref: "#/components/responses/BadGateway" },
        },
      },
      delete: {
        tags: ["Chat"],
        summary: "Delete a chat and all of its messages",
        description: "Requires a valid session cookie.",
        security: [{ cookieAuth: [] }],
        parameters: [chatIdParameter],
        responses: {
          "200": {
            description: "Chat deleted",
            content: {
              "application/json": {
                schema: apiResponse(),
                example: {
                  success: true,
                  statusCode: 200,
                  message: "chat deleted successfully",
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": chatNotFoundResponse,
          "429": { $ref: "#/components/responses/TooManyRequests" },
          "502": { $ref: "#/components/responses/BadGateway" },
        },
      },
    },
    "/api/chat/{id}/messages": {
      post: {
        tags: ["Chat"],
        summary: "Ask a question about a repository and stream the answer",
        description:
          "Requires a valid session cookie. Every chat belongs to one repository: send `repositoryId` with every message. The repository must belong to the caller (404 otherwise) and be INDEXED (409 otherwise), and an existing chat only accepts its own `repositoryId` (404 otherwise). For a new chat the client generates the id with `crypto.randomUUID()` (pass it as `useChat({ id })`) and the first message to that id creates the chat — there is no separate create call.\n\nAnswers are grounded in the repository's code: a small model routes the question (`direct`, `rewrite`, `hyde` or `off_topic`); the query is rewritten into a standalone search query or turned into a hypothetical code snippet (HyDE) when needed; dense vector search and lexical full-text search run in parallel over the repository's indexed chunks; results are deduplicated, reranked with `voyage/rerank-3-lite`, and the top chunks are given to the answer model, which cites `path:start-end`. Questions unrelated to the repository get a fixed refusal without any retrieval.\n\nTransient stream parts for the UI (handle them in useChat's `onData`): `data-status` (`{ stage }`: analyzing → searching → reranking → generating), `data-sources` (`[{ path, startLine, endLine, language, score }]`), and `data-chat-title` on the first message. On a chat's first message the service also generates a title with AI, saves it, and sends it as a transient `data-chat-title` stream part (`{ chatId, title }`) before the stream ends; handle it in useChat's `onData` to update the sidebar entry. An id that belongs to another user returns 404. Saves the user message, then streams the assistant's reply as an AI SDK UI message stream (server-sent events, consumable by `useChat` with `DefaultChatTransport`) and saves the reply once it completes. Earlier messages in the chat are sent to the model as context, so the client only needs to send the new message: use `prepareSendMessagesRequest` to return `{ api: `/api/chat/${id}/messages`, body: { repositoryId, message: messages.at(-1) } }`. Errors that occur before streaming starts are returned as normal JSON responses.",
        security: [{ cookieAuth: [] }],
        parameters: [chatIdParameter],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  repositoryId: { type: "string", format: "uuid" },
                  message: {
                    type: "object",
                    description:
                      "The new user message. Only text parts are persisted; other fields (id, role) are ignored.",
                    properties: {
                      parts: {
                        type: "array",
                        minItems: 1,
                        items: {
                          type: "object",
                          properties: {
                            type: { type: "string", enum: ["text"] },
                            text: {
                              type: "string",
                              minLength: 1,
                              maxLength: 4000,
                              example: "How does the indexing pipeline work?",
                            },
                          },
                          required: ["type", "text"],
                        },
                      },
                    },
                    required: ["parts"],
                  },
                },
                required: ["repositoryId", "message"],
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "UI message stream. Each event is a `data: <json>` line (types such as data-status, data-sources, start, text-start, text-delta, text-end, finish, and data-chat-title on the first message) and the stream ends with `data: [DONE]`.",
            headers: {
              "x-vercel-ai-ui-message-stream": {
                schema: { type: "string", example: "v1" },
              },
            },
            content: {
              "text/event-stream": {
                schema: { type: "string" },
                example:
                  'data: {"type":"data-status","data":{"stage":"analyzing"},"transient":true}\n\ndata: {"type":"data-sources","data":[{"path":"src/indexer/embed.ts","startLine":12,"endLine":40,"language":"typescript","score":0.82}],"transient":true}\n\ndata: {"type":"start","messageId":"a25c0602-fb2c-427c-9985-181c7994437b"}\n\ndata: {"type":"text-delta","id":"msg_1","delta":"Chunks are embedded in `src/indexer/embed.ts:12-40`"}\n\ndata: {"type":"data-chat-title","data":{"chatId":"89196605-9f2d-480f-aaa9-11e91460bb05","title":"Explaining the indexing pipeline"},"transient":true}\n\ndata: [DONE]\n\n',
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": {
            ...chatNotFoundResponse,
            description:
              "Chat or repository not found (or owned by another user), or the chat belongs to a different repository",
          },
          "409": {
            description: "The repository has not finished indexing",
            content: {
              "application/json": {
                schema: apiErrorResponse,
                example: {
                  success: false,
                  statusCode: 409,
                  message:
                    "repository is not indexed yet, try again once indexing has finished",
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
  },
} as const;
