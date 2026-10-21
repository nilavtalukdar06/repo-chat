import { QueryClient, type QueryClientConfig } from "@tanstack/react-query";

export function createQueryClient(config: QueryClientConfig = {}) {
  return new QueryClient({
    ...config,
    defaultOptions: {
      ...config.defaultOptions,
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
        ...config.defaultOptions?.queries,
      },
      mutations: {
        retry: 0,
        ...config.defaultOptions?.mutations,
      },
    },
  });
}

export const queryClient = createQueryClient();
