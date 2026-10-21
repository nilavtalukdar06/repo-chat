import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { EmptyChat } from "@/features/chats/components/empty-chat";
import { RepositoryPicker } from "@/features/chats/components/repository-picker";
import { ensureChatSession } from "@/features/chats/sessions";
import { useAllRepositories } from "@/features/repositories/hooks";

export default function NewChat() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const repositories = useAllRepositories();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const indexed =
    repositories.data?.filter(
      (repository) => repository.status === "INDEXED",
    ) ?? [];
  const preferredId = selectedId ?? searchParams.get("repositoryId");
  const selected =
    indexed.find((repository) => repository.id === preferredId) ?? indexed[0];

  function startChat(prompt: string) {
    if (!selected) return;
    const chatId = crypto.randomUUID();
    ensureChatSession(chatId, selected.id, []).send(prompt);
    void navigate(`/chat/${chatId}`);
  }

  return (
    <EmptyChat
      disabled={!selected}
      onSubmit={startChat}
      repositoryPicker={
        <RepositoryPicker
          repositories={indexed}
          selected={selected}
          isPending={repositories.isPending}
          isError={repositories.isError && !repositories.data}
          isRetrying={repositories.isRefetching}
          onRetry={() => void repositories.refetch()}
          onSelect={setSelectedId}
        />
      }
    />
  );
}
