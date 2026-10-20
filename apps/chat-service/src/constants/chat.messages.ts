export const CHAT_MESSAGES = {
  AUTHENTICATION_REQUIRED: "authentication is required to access this resource",
  NOT_FOUND: "chat not found",
  FETCH_SUCCESS: "chat fetched successfully",
  LIST_FETCH_SUCCESS: "chats fetched successfully",
  UPDATE_SUCCESS: "chat updated successfully",
  DELETE_SUCCESS: "chat deleted successfully",
  DELETE_ALL_SUCCESS: "chats deleted successfully",
  STREAM_FAILED: "failed to generate a response",
  REPOSITORY_NOT_FOUND: "repository not found",
  REPOSITORY_NOT_INDEXED:
    "repository is not indexed yet, try again once indexing has finished",
  REPOSITORY_SERVICE_UNAVAILABLE: "repository-service is unavailable",
  OFF_TOPIC_REPLY:
    "I can only help with questions about this repository. Ask me how something in the codebase works, where it's implemented, or how to change it.",
} as const;
