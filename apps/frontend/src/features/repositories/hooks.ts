import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toastError } from "@/lib/notify";
import { createRepository } from "./api";
import {
  allRepositoriesQueryOptions,
  repositoriesQueryOptions,
  repositoryKeys,
  repositoryLogsQueryOptions,
  repositoryQueryOptions,
} from "./queries";
import type { CreateRepositoryInput } from "./schemas";
import { isIndexingFinished, type RepositoryListParams } from "./types";

export function useRepositories(params: RepositoryListParams) {
  return useQuery(repositoriesQueryOptions(params));
}

export function useAllRepositories() {
  return useQuery({ ...allRepositoriesQueryOptions, staleTime: 0 });
}

export function useRepository(id: string) {
  return useQuery(repositoryQueryOptions(id));
}

export function useRepositoryLogs(id: string) {
  const repository = useRepository(id);
  const isLive =
    !repository.data || !isIndexingFinished(repository.data.status);
  return useQuery(repositoryLogsQueryOptions(id, isLive));
}

export function useCreateRepository({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (input: CreateRepositoryInput) => createRepository(input),
    onSuccess: (repository) => {
      queryClient.setQueryData(
        repositoryKeys.detail(repository.id),
        repository,
      );
      void queryClient.invalidateQueries({ queryKey: repositoryKeys.all });
      onSuccess();
      void navigate(`/repositories/${repository.id}/logs`);
    },
    onError: (error) => toastError(error, "Unable to add repository"),
  });
}
