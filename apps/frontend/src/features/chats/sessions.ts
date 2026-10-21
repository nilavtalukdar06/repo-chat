import { Chat } from "@ai-sdk/react";
import { queryClient } from "@/lib/query-client";
import { toastStreamError } from "@/lib/notify";
import { chatKeys } from "./queries";
import {
  chatTitleDataSchema,
  sourcesDataSchema,
  statusDataSchema,
} from "./schemas";
import { createChatTransport } from "./transport";
import type {
  ChatDetail,
  ChatSource,
  RepoChatMessage,
  RetrievalStage,
} from "./types";

export type ChatSessionState = {
  stage: RetrievalStage | null;
  sourcesByTurn: Record<number, ChatSource[]>;
};

export type ChatSession = {
  chat: Chat<RepoChatMessage>;
  repositoryId: string;
  send: (text: string) => void;
  subscribe: (listener: () => void) => () => void;
  getState: () => ChatSessionState;
};

const sessions = new Map<string, ChatSession>();

function countUserTurns(messages: RepoChatMessage[]) {
  return messages.filter((message) => message.role === "user").length;
}

function createChatSession(
  chatId: string,
  repositoryId: string,
  initialMessages: RepoChatMessage[],
): ChatSession {
  const listeners = new Set<() => void>();
  let state: ChatSessionState = { stage: null, sourcesByTurn: {} };
  let turn = 0;

  function setState(next: Partial<ChatSessionState>) {
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
  }

  const chat = new Chat<RepoChatMessage>({
    id: chatId,
    messages: initialMessages,
    transport: createChatTransport(repositoryId),
    onData: (part) => {
      if (part.type === "data-status") {
        const status = statusDataSchema.safeParse(part.data);
        if (status.success) setState({ stage: status.data.stage });
      } else if (part.type === "data-sources") {
        const sources = sourcesDataSchema.safeParse(part.data);
        if (sources.success) {
          setState({
            sourcesByTurn: { ...state.sourcesByTurn, [turn]: sources.data },
          });
        }
      } else if (part.type === "data-chat-title") {
        const title = chatTitleDataSchema.safeParse(part.data);
        if (!title.success) return;
        queryClient.setQueryData<ChatDetail>(chatKeys.detail(chatId), (old) =>
          old ? { ...old, title: title.data.title } : old,
        );
        void queryClient.invalidateQueries({ queryKey: chatKeys.recent });
      }
    },
    onFinish: () => {
      setState({ stage: null });
      void queryClient.invalidateQueries({ queryKey: chatKeys.recent });
      void queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) });
    },
    onError: (error) => {
      setState({ stage: null });
      toastStreamError(error, "Unable to get a response");
    },
  });

  return {
    chat,
    repositoryId,
    send: (text) => {
      turn = countUserTurns(chat.messages);
      setState({ stage: null });
      void chat.sendMessage({ text });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState: () => state,
  };
}

export function getChatSession(chatId: string) {
  return sessions.get(chatId);
}

export function ensureChatSession(
  chatId: string,
  repositoryId: string,
  initialMessages: RepoChatMessage[],
) {
  let session = sessions.get(chatId);
  if (!session) {
    session = createChatSession(chatId, repositoryId, initialMessages);
    sessions.set(chatId, session);
  }
  return session;
}

export function disposeChatSession(chatId: string) {
  void sessions.get(chatId)?.chat.stop();
  sessions.delete(chatId);
}

export function disposeAllChatSessions() {
  for (const chatId of [...sessions.keys()]) disposeChatSession(chatId);
}
