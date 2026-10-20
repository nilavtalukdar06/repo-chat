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

const uuidParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
} as const;

const chatSchema = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    title: { type: "string" },
    userId: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
} as const;

const uiMessageSchema = {
  type: "object",
  description:
    "AI SDK UIMessage, ready to pass to useChat as initial messages.",
  properties: {
    id: { type: "string" },
    role: { type: "string", enum: ["user", "assistant", "system"] },
    parts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", example: "text" },
          text: { type: "string" },
        },
      },
    },
  },
} as const;

const chatWithMessagesSchema = {
  type: "object",
  properties: {
    ...chatSchema.properties,
    messages: { type: "array", items: uiMessageSchema },
  },
} as const;

const jsonResponse = (
  description: string,
  schema: Record<string, unknown>,
) => ({
  description,
  content: { "application/json": { schema } },
});

const errorResponses = {
  "400": jsonResponse("Validation failed", apiResponse()),
  "401": jsonResponse("Missing x-user-id header", apiResponse()),
  "404": jsonResponse("Chat not found", apiResponse()),
};

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
  tags: [
    { name: "Health", description: "Liveness and readiness probes" },
    { name: "Chat", description: "Chats and streaming assistant replies" },
  ],
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
    "/api/chat": {
      post: {
        tags: ["Chat"],
        summary: "Create a chat",
        parameters: [{ $ref: "#/components/parameters/UserId" }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { title: { type: "string", maxLength: 100 } },
              },
            },
          },
        },
        responses: {
          "201": jsonResponse("Chat created", apiResponse(chatSchema)),
          "401": errorResponses["401"],
        },
      },
      get: {
        tags: ["Chat"],
        summary: "List the caller's chats, most recently active first",
        parameters: [
          { $ref: "#/components/parameters/UserId" },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          "200": jsonResponse(
            "Chats fetched",
            apiResponse({ type: "array", items: chatSchema }),
          ),
          "401": errorResponses["401"],
        },
      },
    },
    "/api/chat/{id}": {
      get: {
        tags: ["Chat"],
        summary: "Get a chat with its messages",
        parameters: [{ $ref: "#/components/parameters/UserId" }, uuidParam],
        responses: {
          "200": jsonResponse(
            "Chat fetched",
            apiResponse(chatWithMessagesSchema),
          ),
          ...errorResponses,
        },
      },
      patch: {
        tags: ["Chat"],
        summary: "Rename a chat",
        parameters: [{ $ref: "#/components/parameters/UserId" }, uuidParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: { title: { type: "string", maxLength: 100 } },
              },
            },
          },
        },
        responses: {
          "200": jsonResponse("Chat updated", apiResponse(chatSchema)),
          ...errorResponses,
        },
      },
      delete: {
        tags: ["Chat"],
        summary: "Delete a chat and its messages",
        parameters: [{ $ref: "#/components/parameters/UserId" }, uuidParam],
        responses: {
          "200": jsonResponse("Chat deleted", apiResponse()),
          "401": errorResponses["401"],
          "404": errorResponses["404"],
        },
      },
    },
    "/api/chat/{id}/messages": {
      post: {
        tags: ["Chat"],
        summary: "Send a message and stream the assistant's reply",
        description:
          "Persists the user message, streams the reply as an AI SDK UI message stream (SSE, consumable by useChat), then persists the assistant message. Prior messages in the chat are sent to the model as context. Use prepareSendMessagesRequest on the client to send only the last message.",
        parameters: [{ $ref: "#/components/parameters/UserId" }, uuidParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["message"],
                properties: {
                  message: {
                    type: "object",
                    required: ["parts"],
                    properties: {
                      parts: {
                        type: "array",
                        minItems: 1,
                        items: {
                          type: "object",
                          required: ["type", "text"],
                          properties: {
                            type: { type: "string", enum: ["text"] },
                            text: {
                              type: "string",
                              minLength: 1,
                              maxLength: 4000,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "UI message stream",
            content: { "text/event-stream": { schema: { type: "string" } } },
          },
          ...errorResponses,
        },
      },
    },
  },
  components: {
    parameters: {
      UserId: {
        name: "x-user-id",
        in: "header",
        required: true,
        description: "Caller identity, set by the API gateway.",
        schema: { type: "string" },
      },
    },
  },
};
