import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import {
  fetchAllRepositories,
  fetchRepositories,
  fetchRepository,
  fetchRepositoryLogs,
} from "./api";
import { isIndexingFinished, type RepositoryListParams } from "./types";

const LIST_POLL_INTERVAL = 3000;
const LOGS_POLL_INTERVAL = 1000;

export const repositoryKeys = {
  all: ["repositories"] as const,
  list: (params: RepositoryListParams) =>
    [...repositoryKeys.all, "list", params] as const,
  detail: (id: string) => [...repositoryKeys.all, "detail", id] as const,
  logs: (id: string) => [...repositoryKeys.all, "logs", id] as const,
};

export const allRepositoriesQueryOptions = queryOptions({
  queryKey: [...repositoryKeys.all, "all"],
  queryFn: fetchAllRepositories,
});

export function repositoriesQueryOptions(params: RepositoryListParams) {
  return queryOptions({
    queryKey: repositoryKeys.list(params),
    queryFn: () => fetchRepositories(params),
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      query.state.data?.data.some(
        (repository) => !isIndexingFinished(repository.status),
      )
        ? LIST_POLL_INTERVAL
        : false,
  });
}

export function repositoryQueryOptions(id: string) {
  return queryOptions({
    queryKey: repositoryKeys.detail(id),
    queryFn: () => fetchRepository(id),
    refetchInterval: (query) =>
      query.state.data && isIndexingFinished(query.state.data.status)
        ? false
        : LOGS_POLL_INTERVAL,
  });
}

export function repositoryLogsQueryOptions(id: string, isLive: boolean) {
  return queryOptions({
    queryKey: repositoryKeys.logs(id),
    queryFn: () => fetchRepositoryLogs(id),
    refetchInterval: isLive ? LOGS_POLL_INTERVAL : false,
  });
}
