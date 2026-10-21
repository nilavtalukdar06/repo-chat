export type Chat = {
  id: string;
  title: string;
  userId: string;
  repositoryId: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatListMeta = {
  nextCursor: string | null;
  hasNextPage: boolean;
};
