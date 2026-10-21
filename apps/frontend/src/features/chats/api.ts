import { api, type ApiResponse } from "@/lib/api";
import type { Chat, ChatListMeta } from "./types";

type ListChatsParams = {
  repositoryId: string;
  limit: number;
  cursor?: string;
};

export async function fetchChats(params: ListChatsParams) {
  const { data } = await api.get<ApiResponse<Chat[], ChatListMeta>>(
    "/api/chat",
    { params },
  );
  return data;
}
