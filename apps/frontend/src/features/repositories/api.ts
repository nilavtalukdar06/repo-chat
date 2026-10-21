import { api, type ApiResponse } from "@/lib/api";
import type { Repository, RepositoryListMeta } from "./types";

const PAGE_LIMIT = 100;

async function fetchRepositoryPage(page: number) {
  const { data } = await api.get<ApiResponse<Repository[], RepositoryListMeta>>(
    "/api/repository",
    { params: { page, limit: PAGE_LIMIT } },
  );
  return data;
}

export async function fetchAllRepositories() {
  const repositories: Repository[] = [];
  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const result = await fetchRepositoryPage(page);
    repositories.push(...result.data);
    hasNextPage = result.meta.hasNextPage;
    page += 1;
  }
  return repositories;
}
