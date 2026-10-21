import { api, type ApiResponse } from "@/lib/api";
import type { Chat, ChatDetail, ChatListMeta } from "./types";

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

export async function fetchChat(id: string) {
  const { data } = await api.get<ApiResponse<ChatDetail>>(`/api/chat/${id}`);
  return data.data;
}

export async function renameChat(id: string, title: string) {
  const { data } = await api.patch<ApiResponse<Chat>>(`/api/chat/${id}`, {
    title,
  });
  return data.data;
}

export async function deleteChat(id: string) {
  await api.delete(`/api/chat/${id}`);
}
