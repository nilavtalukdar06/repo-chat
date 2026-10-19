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
  UPDATE_SUCCESS: "repository status updated successfully",
  DELETE_SUCCESS: "repository deleted successfully",
} as const;
