import { queryOptions } from "@tanstack/react-query";
import { fetchAllRepositories } from "./api";

export const allRepositoriesQueryOptions = queryOptions({
  queryKey: ["repositories", "all"],
  queryFn: fetchAllRepositories,
});
