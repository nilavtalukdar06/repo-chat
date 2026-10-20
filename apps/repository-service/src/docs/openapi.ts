import { env } from "@/config/env";

const repositorySchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string", example: "repo-chat" },
    description: {
      type: "string",
      nullable: true,
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
      example: "QUEUED",
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
    metadata: { type: "string", nullable: true },
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

const paginationMetaSchema = {
  type: "object",
  properties: {
    total: { type: "integer", example: 1 },
    page: { type: "integer", example: 1 },
    limit: { type: "integer", example: 10 },
    totalPages: { type: "integer", example: 1 },
    hasNextPage: { type: "boolean", example: false },
    hasPrevPage: { type: "boolean", example: false },
  },
  required: [
    "total",
    "page",
    "limit",
    "totalPages",
    "hasNextPage",
    "hasPrevPage",
  ],
} as const;

function apiResponse(
  dataSchema?: Record<string, unknown>,
  metaSchema?: Record<string, unknown>,
) {
  return {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      statusCode: { type: "integer", example: 200 },
      message: { type: "string" },
      ...(dataSchema ? { data: dataSchema } : {}),
      meta: metaSchema ?? { type: "object", nullable: true },
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
  description: "GitHub's API rate limit was exceeded",
  content: {
    "application/json": {
      schema: apiErrorResponse,
      example: {
        success: false,
        statusCode: 429,
        message: "github api rate limit exceeded",
        errors: [],
      },
    },
  },
};

const notFoundResponse = {
  description:
    "No repository with this id exists for the caller. Repositories owned by other users are reported as not found.",
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
};

const unauthorizedResponse = {
  description: "The x-user-id header is missing from the request",
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
};

const badGatewayResponse = {
  description:
    "An upstream dependency failed: GitHub's API (create), the ECS indexing task (create, or update to QUEUED), or the chat-service (delete)",
  content: {
    "application/json": {
      schema: apiErrorResponse,
      example: {
        success: false,
        statusCode: 502,
        message: "github api returned an unexpected error",
        errors: [],
      },
    },
  },
};

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Repository Service API",
    description:
      "Owns repositories imported from GitHub: registering a repository for indexing, tracking indexing status, and reading the indexing logs emitted for each one. Every repository is private to the user who registered it: all routes are scoped to the x-user-id header, and a repository owned by someone else is reported as 404. Sits behind the API gateway, which resolves the caller's identity and forwards it as the x-user-id header rather than a session cookie.",
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
      name: "Repository",
      description:
        "Create, list, fetch, update and delete repositories, and read their indexing logs",
    },
  ],
  components: {
    securitySchemes: {
      userIdHeader: {
        type: "apiKey",
        in: "header",
        name: "x-user-id",
        description:
          "Caller identity forwarded by the API gateway after it validates the session with the auth-service. Requests without this header are rejected with 401.",
      },
    },
    schemas: {
      Repository: repositorySchema,
      LogEvent: logEventSchema,
      PaginationMeta: paginationMetaSchema,
      ApiErrorResponse: apiErrorResponse,
    },
    responses: {
      ValidationError: {
        description: "Request params, query or body failed schema validation",
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
                  githubUrl: ["please provide a valid github repository url"],
                },
              },
            },
          },
        },
      },
      Unauthorized: unauthorizedResponse,
      NotFound: notFoundResponse,
      TooManyRequests: tooManyRequestsResponse,
      BadGateway: badGatewayResponse,
    },
  },
  security: [{ userIdHeader: [] }],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Liveness check",
        description:
          "Reports whether the service, Postgres, ClickHouse and Kafka dependencies are reachable.",
        security: [],
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
                    services: {
                      type: "object",
                      properties: {
                        kafka: { type: "boolean" },
                        clickhouse: { type: "boolean" },
                        database: { type: "boolean" },
                      },
                    },
                  },
                }),
              },
            },
          },
          "503": {
            description:
              "Service is unhealthy (Postgres, ClickHouse or Kafka unreachable)",
            content: {
              "application/json": {
                schema: apiResponse({
                  type: "object",
                  properties: {
                    uptime: { type: "number" },
                    timestamp: { type: "string", format: "date-time" },
                    services: {
                      type: "object",
                      properties: {
                        kafka: { type: "boolean" },
                        clickhouse: { type: "boolean" },
                        database: { type: "boolean" },
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
        security: [],
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
    "/api/repository": {
      post: {
        tags: ["Repository"],
        summary: "Register a GitHub repository for indexing",
        description:
          "Fetches the repository's metadata from the GitHub API, persists it with status QUEUED, and starts an ECS indexing task for it.",
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
            description: "Repository registered successfully",
            content: {
              "application/json": {
                schema: apiResponse({
                  $ref: "#/components/schemas/Repository",
                }),
                example: {
                  success: true,
                  statusCode: 201,
                  message: "repository created successfully",
                },
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
          "502": { $ref: "#/components/responses/BadGateway" },
        },
      },
      get: {
        tags: ["Repository"],
        summary: "List the caller's repositories",
        description: "Paginated, optionally filtered by name or description.",
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
            description: "Repositories fetched successfully",
            content: {
              "application/json": {
                schema: apiResponse(
                  {
                    type: "array",
                    items: { $ref: "#/components/schemas/Repository" },
                  },
                  { $ref: "#/components/schemas/PaginationMeta" },
                ),
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/repository/{id}": {
      get: {
        tags: ["Repository"],
        summary: "Get a repository by id",
        description: "Returns 404 if the repository belongs to another user.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Repository fetched successfully",
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
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Repository"],
        summary: "Update a repository's indexing status",
        description:
          "Setting status to QUEUED starts a new ECS indexing task for the repository (re-index). If the task cannot be started the repository is marked FAILED and 502 is returned. Indexing normally reports its own progress, so clients should use this to retry a FAILED repository.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
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
            description: "Repository status updated successfully",
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
          "404": { $ref: "#/components/responses/NotFound" },
          "502": { $ref: "#/components/responses/BadGateway" },
        },
      },
      delete: {
        tags: ["Repository"],
        summary: "Delete a repository",
        description:
          "Not allowed while indexing is in flight (status QUEUED or INDEXING, 409): the indexing task would keep writing chunks and logs for a repository that no longer exists. Wait for INDEXED or FAILED (or retry/cancel via PATCH). Otherwise deletes everything that belongs to the repository, then the repository itself: the caller's chats and messages about it (via the chat-service), its indexing logs in ClickHouse, and its embedded code chunks in Qdrant. The repository row is removed last, so if any cleanup step fails (502) the repository still exists and the delete can be retried.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Repository deleted successfully",
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
          "404": { $ref: "#/components/responses/NotFound" },
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
          "502": { $ref: "#/components/responses/BadGateway" },
        },
      },
    },
    "/api/repository/{id}/logs": {
      get: {
        tags: ["Repository"],
        summary: "Get a repository's indexing logs",
        description:
          "Reads log events for the repository from ClickHouse, ordered oldest first. Returns 404 if the repository doesn't exist or belongs to another user.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Repository logs fetched successfully",
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
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
  },
} as const;
