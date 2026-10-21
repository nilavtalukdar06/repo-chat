import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Link, useMatch } from "react-router";
import { QueryError } from "@/components/query-error";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from "@/components/ui/sidebar";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useRecentChats } from "../hooks";
import type { Chat } from "../types";
import { DeleteChatDialog } from "./delete-chat-dialog";
import { RenameChatDialog } from "./rename-chat-dialog";

const SKELETON_ROWS = 6;
const NEXT_PAGE_SKELETON_ROWS = 2;

function SkeletonRows({ count }: { count: number }) {
  return Array.from({ length: count }, (_, index) => (
    <SidebarMenuItem key={index}>
      <SidebarMenuSkeleton className="h-9" />
    </SidebarMenuItem>
  ));
}

export function RecentChats() {
  const chats = useRecentChats();
  const { setOpenMobile, isMobile } = useSidebar();
  const [renaming, setRenaming] = useState<Chat | null>(null);
  const [deleting, setDeleting] = useState<Chat | null>(null);
  const activeChatId = useMatch("/chat/:chatId")?.params.chatId;

  const sentinelRef = useInfiniteScroll({
    enabled:
      chats.hasNextPage &&
      !chats.isFetchingNextPage &&
      !chats.isFetchNextPageError,
    onLoadMore: () => void chats.fetchNextPage(),
  });

  return (
    <SidebarGroup className="">
      <SidebarGroupLabel className="h-9 text-sm font-normal text-muted-foreground">
        Recents
      </SidebarGroupLabel>
      {chats.isPending ? (
        <SidebarMenu>
          <SkeletonRows count={SKELETON_ROWS} />
        </SidebarMenu>
      ) : chats.isError && !chats.data ? (
        <QueryError
          title="Unable to load chats"
          error={chats.error}
          onRetry={() => void chats.refetch()}
          isRetrying={chats.isRefetching}
        />
      ) : chats.data?.length === 0 ? (
        <p className="px-2 text-xs font-light text-muted-foreground">
          No chats yet
        </p>
      ) : (
        <SidebarMenu>
          {chats.data?.map((chat) => (
            <SidebarMenuItem key={chat.id}>
              <SidebarMenuButton
                isActive={chat.id === activeChatId}
                className="h-9 rounded-xl px-3 text-sm data-active:font-normal"
                render={<Link to={`/chat/${chat.id}`} title={chat.title} />}
                onClick={() => setOpenMobile(false)}
              >
                <span>{chat.title}</span>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<SidebarMenuAction showOnHover className="rounded" />}
                >
                  <MoreHorizontalIcon />
                  <span className="sr-only">Chat actions</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side={isMobile ? "bottom" : "right"}
                  align="start"
                  className="w-36 rounded"
                >
                  <DropdownMenuItem
                    className="font-light"
                    onClick={() => setRenaming(chat)}
                  >
                    <PencilIcon />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    className="font-light"
                    onClick={() => setDeleting(chat)}
                  >
                    <Trash2Icon />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ))}
          {chats.isFetchingNextPage ? (
            <SkeletonRows count={NEXT_PAGE_SKELETON_ROWS} />
          ) : null}
        </SidebarMenu>
      )}
      {chats.isFetchNextPageError ? (
        <QueryError
          className="mt-2"
          title="Unable to load more chats"
          error={chats.error}
          onRetry={() => void chats.fetchNextPage()}
          isRetrying={chats.isFetchingNextPage}
        />
      ) : null}
      <div ref={sentinelRef} aria-hidden className="h-px" />
      <RenameChatDialog chat={renaming} onClose={() => setRenaming(null)} />
      <DeleteChatDialog chat={deleting} onClose={() => setDeleting(null)} />
    </SidebarGroup>
  );
}
