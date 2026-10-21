import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toastError } from "@/lib/notify";
import { deleteChat, renameChat } from "./api";
import { chatKeys, chatQueryOptions, recentChatsQueryOptions } from "./queries";
import { disposeChatSession } from "./sessions";
import type { ChatDetail } from "./types";

export function useRecentChats() {
  return useInfiniteQuery({
    ...recentChatsQueryOptions,
    select: (data) => data.pages.flatMap((page) => page.chats),
  });
}

export function useChatDetail(id: string, enabled: boolean) {
  return useQuery({ ...chatQueryOptions(id), enabled });
}

export function useRenameChat({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      renameChat(id, title),
    onSuccess: (chat) => {
      queryClient.setQueryData<ChatDetail>(chatKeys.detail(chat.id), (old) =>
        old ? { ...old, title: chat.title } : old,
      );
      void queryClient.invalidateQueries({ queryKey: chatKeys.recent });
      onSuccess();
    },
    onError: (error) => toastError(error, "Unable to rename chat"),
  });
}

export function useDeleteChat({
  onSuccess,
}: {
  onSuccess: (id: string) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteChat(id),
    onSuccess: (_, id) => {
      disposeChatSession(id);
      queryClient.removeQueries({ queryKey: chatKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: chatKeys.recent });
      onSuccess(id);
    },
    onError: (error) => toastError(error, "Unable to delete chat"),
  });
}
