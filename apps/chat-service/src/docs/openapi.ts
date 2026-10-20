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
    repositoryId: { type: "string", format: "uuid" },
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

const cursorMetaSchema = {
  type: "object",
  properties: {
    nextCursor: { type: ["string", "null"] },
    hasNextPage: { type: "boolean" },
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
      get: {
        tags: ["Chat"],
        summary: "List the caller's chats, most recently active first",
        description:
          "Cursor-paginated for infinite scrolling. Omit `cursor` for the first page, then pass the previous page's `meta.nextCursor` until `meta.hasNextPage` is false. Ordered by `updatedAt` desc, so a chat that receives a new message moves to the top.",
        parameters: [
          { $ref: "#/components/parameters/UserId" },
          {
            name: "repositoryId",
            in: "query",
            required: true,
            description: "Only chats about this repository are returned.",
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
          "200": jsonResponse("Chats fetched", {
            ...apiResponse({ type: "array", items: chatSchema }),
            properties: {
              ...apiResponse({ type: "array", items: chatSchema }).properties,
              meta: cursorMetaSchema,
            },
          }),
          "400": jsonResponse(
            "Missing repositoryId, or invalid limit or cursor",
            apiResponse(),
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
          "Answers a question about one indexed repository. The client generates the chat id (crypto.randomUUID) for a new chat; the first message to an unknown id creates the chat for `repositoryId`, which must belong to the caller and be INDEXED. Every later message must send the same `repositoryId`.\n\nPipeline: a small model routes the question (`direct`, `rewrite`, `hyde` or `off_topic`); `rewrite` turns it into a standalone search query and `hyde` writes a hypothetical code snippet to embed; dense (Qdrant vectors) and lexical (Qdrant full-text) search run in parallel over the repository's chunks; results are deduplicated and reranked with `voyage/rerank-3-lite`; the top chunks are passed to the answer model, which cites `path:start-end`. `off_topic` questions get a fixed refusal without retrieval.\n\nTransient stream parts for the UI (received in useChat's onData): `data-status` (`{ stage }`: analyzing, searching, reranking, generating), `data-sources` (`[{ path, startLine, endLine, language, score }]`), and on a chat's first message `data-chat-title` (`{ chatId, title }`). Persists the user message and the assistant reply. Use prepareSendMessagesRequest on the client to send only the last message plus `repositoryId`.",
        parameters: [{ $ref: "#/components/parameters/UserId" }, uuidParam],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["repositoryId", "message"],
                properties: {
                  repositoryId: { type: "string", format: "uuid" },
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
            content: {
              "text/event-stream": {
                schema: { type: "string" },
                example:
                  'data: {"type":"data-status","data":{"stage":"analyzing"},"transient":true}\n\ndata: {"type":"data-sources","data":[{"path":"src/indexer/embed.ts","startLine":12,"endLine":40,"language":"typescript","score":0.82}],"transient":true}\n\ndata: {"type":"start","messageId":"a25c0602-fb2c-427c-9985-181c7994437b"}\n\ndata: {"type":"text-delta","id":"msg_1","delta":"Chunks are embedded in `src/indexer/embed.ts:12-40`"}\n\ndata: {"type":"data-chat-title","data":{"chatId":"89196605-9f2d-480f-aaa9-11e91460bb05","title":"Explaining the indexing pipeline"},"transient":true}\n\ndata: [DONE]\n\n',
              },
            },
          },
          ...errorResponses,
          "404": jsonResponse(
            "Chat or repository not found, or the chat belongs to another repository",
            apiResponse(),
          ),
          "409": jsonResponse("Repository is not indexed yet", apiResponse()),
          "502": jsonResponse(
            "repository-service is unavailable",
            apiResponse(),
          ),
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
