import { infiniteQueryOptions } from "@tanstack/react-query";
import { allRepositoriesQueryOptions } from "@/features/repositories/queries";
import { fetchChats } from "./api";
import type { Chat } from "./types";

const PAGE_SIZE = 20;

type ChatSource = {
  repositoryId: string;
  buffer: Chat[];
  cursor: string | null | undefined;
};

type RecentChatsPage = {
  chats: Chat[];
  sources: ChatSource[];
};

function isNewer(a: Chat, b: Chat) {
  return a.updatedAt === b.updatedAt ? a.id > b.id : a.updatedAt > b.updatedAt;
}

async function fillSource(source: ChatSource): Promise<ChatSource> {
  if (source.buffer.length > 0 || source.cursor === null) return source;
  const { data, meta } = await fetchChats({
    repositoryId: source.repositoryId,
    cursor: source.cursor,
    limit: PAGE_SIZE,
  });
  return { ...source, buffer: data, cursor: meta.nextCursor };
}

async function loadPage(initial: ChatSource[]): Promise<RecentChatsPage> {
  let sources = initial;
  const chats: Chat[] = [];

  while (chats.length < PAGE_SIZE) {
    sources = await Promise.all(sources.map(fillSource));

    let newest: ChatSource | undefined;
    for (const source of sources) {
      const head = source.buffer[0];
      if (head && (!newest || isNewer(head, newest.buffer[0]!))) {
        newest = source;
      }
    }
    if (!newest) break;

    chats.push(newest.buffer[0]!);
    const picked = newest;
    sources = sources.map((source) =>
      source === picked
        ? { ...source, buffer: source.buffer.slice(1) }
        : source,
    );
  }

  return { chats, sources };
}

export const recentChatsQueryOptions = infiniteQueryOptions({
  queryKey: ["chats", "recent"],
  initialPageParam: null as ChatSource[] | null,
  queryFn: async ({ pageParam, client }) => {
    const sources =
      pageParam ??
      (await client.fetchQuery(allRepositoriesQueryOptions)).map(
        (repository): ChatSource => ({
          repositoryId: repository.id,
          buffer: [],
          cursor: undefined,
        }),
      );
    return loadPage(sources);
  },
  getNextPageParam: ({ sources }) =>
    sources.some((source) => source.buffer.length > 0 || source.cursor !== null)
      ? sources
      : undefined,
});
