export const REPO_MESSAGES = {
  AUTHENTICATION_REQUIRED: "authentication is required to access this resource",
  NOT_FOUND: "repository not found",
  INVALID_GITHUB_URL: "invalid github repository url",
  GITHUB_REPO_NOT_FOUND: "github repository not found",
  GITHUB_RATE_LIMIT_EXCEEDED: "github api rate limit exceeded",
  GITHUB_API_UNAVAILABLE: "failed to reach github api",
  GITHUB_API_ERROR: "github api returned an unexpected error",
  CREATE_SUCCESS: "repository created successfully",
  FETCH_SUCCESS: "repository fetched successfully",
  LIST_FETCH_SUCCESS: "repositories fetched successfully",
  LOGS_FETCH_SUCCESS: "repository logs fetched successfully",
  UPDATE_SUCCESS: "repository status updated successfully",
  DELETE_SUCCESS: "repository deleted successfully",
  INDEXING_TASK_START_FAILED: "failed to start repository indexing task",
  INDEXING_TASK_NOT_STARTED:
    "ecs did not return a task for the indexing run request",
} as const;
