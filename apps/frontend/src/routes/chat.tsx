import { MessageCircleDashedIcon } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatSession } from "@/features/chats/components/chat-session";
import { useChatDetail } from "@/features/chats/hooks";
import { ensureChatSession, getChatSession } from "@/features/chats/sessions";
import { useAllRepositories } from "@/features/repositories/hooks";
import { getErrorStatus } from "@/lib/api-error";

function ChatSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
      <Skeleton className="h-9 w-1/2 self-end rounded-xl" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-9 w-1/3 self-end rounded-xl" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

function ChatNotFound() {
  return (
    <Empty className="flex-1">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MessageCircleDashedIcon />
        </EmptyMedia>
        <EmptyTitle className="font-normal">Chat not found</EmptyTitle>
        <EmptyDescription className="font-light">
          It may have been deleted, or the link is wrong.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          size="sm"
          className="rounded-md font-light"
          nativeButton={false}
          render={<Link to="/" />}
        >
          Start a new chat
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function ChatRoute({ chatId }: { chatId: string }) {
  const [activeSession] = useState(() => getChatSession(chatId));
  const detail = useChatDetail(chatId, !activeSession);
  const repositories = useAllRepositories();
  const repositoryId = activeSession?.repositoryId ?? detail.data?.repositoryId;
  const repository = repositories.data?.find(({ id }) => id === repositoryId);

  if (activeSession) {
    return <ChatSession session={activeSession} repository={repository} />;
  }

  if (detail.isPending) return <ChatSkeleton />;

  if (detail.isError) {
    return getErrorStatus(detail.error) === 404 ? (
      <ChatNotFound />
    ) : (
      <div className="mx-auto w-full max-w-3xl p-4">
        <QueryError
          title="Unable to load this chat"
          error={detail.error}
          onRetry={() => void detail.refetch()}
          isRetrying={detail.isRefetching}
        />
      </div>
    );
  }

  const session = ensureChatSession(
    chatId,
    detail.data.repositoryId,
    detail.data.messages,
  );

  return <ChatSession session={session} repository={repository} />;
}

export default function ChatPage() {
  const { chatId = "" } = useParams();
  return <ChatRoute key={chatId} chatId={chatId} />;
}
