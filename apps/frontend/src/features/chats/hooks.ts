import { useInfiniteQuery } from "@tanstack/react-query";
import { recentChatsQueryOptions } from "./queries";

export function useRecentChats() {
  return useInfiniteQuery({
    ...recentChatsQueryOptions,
    select: (data) => data.pages.flatMap((page) => page.chats),
  });
}
