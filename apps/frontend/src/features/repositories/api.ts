import { api, type ApiResponse } from "@/lib/api";
import type { CreateRepositoryInput } from "./schemas";
import type {
  Repository,
  RepositoryListMeta,
  RepositoryListParams,
  RepositoryLog,
} from "./types";

const ALL_PAGE_LIMIT = 100;

export async function fetchRepositories(params: RepositoryListParams) {
  const { data } = await api.get<ApiResponse<Repository[], RepositoryListMeta>>(
    "/api/repository",
    { params: { ...params, search: params.search || undefined } },
  );
  return data;
}

export async function fetchAllRepositories() {
  const repositories: Repository[] = [];
  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const result = await fetchRepositories({ page, limit: ALL_PAGE_LIMIT });
    repositories.push(...result.data);
    hasNextPage = result.meta.hasNextPage;
    page += 1;
  }
  return repositories;
}

export async function fetchRepository(id: string) {
  const { data } = await api.get<ApiResponse<Repository>>(
    `/api/repository/${id}`,
  );
  return data.data;
}

export async function fetchRepositoryLogs(id: string) {
  const { data } = await api.get<ApiResponse<RepositoryLog[]>>(
    `/api/repository/${id}/logs`,
  );
  return data.data;
}

export async function createRepository(input: CreateRepositoryInput) {
  const { data } = await api.post<ApiResponse<Repository>>(
    "/api/repository",
    input,
  );
  return data.data;
}
