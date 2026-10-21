import { useChat } from "@ai-sdk/react";
import { FolderGitIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { InputGroupText } from "@/components/ui/input-group";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import type { Repository } from "@/features/repositories/types";
import type { ChatSession as ChatSessionStore } from "../sessions";
import { getMessageText } from "../types";
import { AssistantMessage, UserMessage } from "./chat-message";
import { PromptInput } from "./prompt-input";

type ChatSessionProps = {
  session: ChatSessionStore;
  repository: Repository | undefined;
};

export function ChatSession({ session, repository }: ChatSessionProps) {
  const { messages, status, stop } = useChat({ chat: session.chat });
  const { stage, sourcesByTurn } = useSyncExternalStore(
    session.subscribe,
    session.getState,
  );
  const busy = status === "submitted" || status === "streaming";

  const userTurns: number[] = [];
  let userTurnCount = 0;
  for (const message of messages) {
    if (message.role === "user") userTurnCount += 1;
    userTurns.push(userTurnCount - 1);
  }
  const lastTurn = userTurnCount - 1;
  const lastMessage = messages.at(-1);
  const awaitingReply = busy && lastMessage?.role === "user";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessageScrollerProvider autoScroll defaultScrollPosition="last-anchor">
        <MessageScroller className="flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent
              aria-busy={busy}
              className="mx-auto w-full max-w-3xl px-4 py-6"
            >
              {messages.map((message, index) => {
                if (message.role === "user") {
                  return (
                    <MessageScrollerItem
                      key={message.id}
                      messageId={message.id}
                      scrollAnchor
                    >
                      <UserMessage text={getMessageText(message)} />
                    </MessageScrollerItem>
                  );
                }
                return (
                  <MessageScrollerItem key={message.id} messageId={message.id}>
                    <AssistantMessage
                      text={getMessageText(message)}
                      sources={sourcesByTurn[userTurns[index]!]}
                      githubUrl={repository?.githubUrl}
                      streaming={busy && message === lastMessage}
                      stage={stage}
                    />
                  </MessageScrollerItem>
                );
              })}
              {awaitingReply ? (
                <MessageScrollerItem messageId="pending-reply">
                  <AssistantMessage
                    text=""
                    sources={sourcesByTurn[lastTurn]}
                    githubUrl={repository?.githubUrl}
                    streaming
                    stage={stage}
                  />
                </MessageScrollerItem>
              ) : null}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton className="rounded-full" />
        </MessageScroller>
      </MessageScrollerProvider>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 pb-3">
        <PromptInput
          status={status}
          onStop={() => void stop()}
          onSubmit={(text) => session.send(text)}
          leading={
            <InputGroupText className="max-w-56 font-light">
              <FolderGitIcon />
              <span className="truncate">
                {repository?.name ?? "Repository"}
              </span>
            </InputGroupText>
          }
        />
        <p className="text-center text-xs font-light text-muted-foreground">
          Answers come from the indexed code and can be wrong. Check important
          details.
        </p>
      </div>
    </div>
  );
}
