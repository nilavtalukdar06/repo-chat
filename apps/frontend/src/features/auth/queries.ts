import { queryOptions } from "@tanstack/react-query";
import { fetchSession } from "./api";

export const sessionQueryOptions = queryOptions({
  queryKey: ["auth", "session"],
  queryFn: fetchSession,
  retry: false,
});
