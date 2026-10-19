import { REPO_MESSAGES } from "@/constants/repository.messages";
import { ApiError } from "@/core/api-error";
import axios, { isAxiosError } from "axios";
import { StatusCodes } from "http-status-codes";

const GITHUB_API_BASE_URL = "https://api.github.com/repos";
const GITHUB_URL_PATTERN =
  /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i;

export interface GithubRepoResponse {
  name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
}

export function parseGithubUrl(githubUrl: string): {
  owner: string;
  repo: string;
} {
  const cleanedUrl = githubUrl.trim().split(/[?#]/)[0];
  const match = cleanedUrl?.match(GITHUB_URL_PATTERN);
  if (!match) {
    throw new ApiError({
      statusCode: StatusCodes.BAD_REQUEST,
      message: REPO_MESSAGES.INVALID_GITHUB_URL,
    });
  }
  const [, owner, repo] = match;
  return { owner: owner!, repo: repo! };
}

export async function fetchGithubRepo(
  owner: string,
  repo: string,
): Promise<GithubRepoResponse> {
  try {
    const response = await axios.get<GithubRepoResponse>(
      `${GITHUB_API_BASE_URL}/${owner}/${repo}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response?.status === StatusCodes.NOT_FOUND) {
        throw new ApiError({
          statusCode: StatusCodes.NOT_FOUND,
          message: REPO_MESSAGES.GITHUB_REPO_NOT_FOUND,
          cause: error,
        });
      }

      if (
        error.response?.status === StatusCodes.FORBIDDEN &&
        error.response.headers["x-ratelimit-remaining"] === "0"
      ) {
        throw new ApiError({
          statusCode: StatusCodes.TOO_MANY_REQUESTS,
          message: REPO_MESSAGES.GITHUB_RATE_LIMIT_EXCEEDED,
          cause: error,
        });
      }

      if (error.response) {
        throw new ApiError({
          statusCode: StatusCodes.BAD_GATEWAY,
          message: REPO_MESSAGES.GITHUB_API_ERROR,
          cause: error,
        });
      }

      throw new ApiError({
        statusCode: StatusCodes.BAD_GATEWAY,
        message: REPO_MESSAGES.GITHUB_API_UNAVAILABLE,
        cause: error,
      });
    }

    throw error;
  }
}
