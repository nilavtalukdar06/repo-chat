export type RepositoryStatus = "QUEUED" | "INDEXING" | "INDEXED" | "FAILED";

export type Repository = {
  id: string;
  name: string;
  description: string | null;
  githubUrl: string;
  stars: number;
  language: string;
  status: RepositoryStatus;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type RepositoryListMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type RepositoryListParams = {
  page: number;
  limit: number;
  search?: string;
};

export type RepositoryLog = {
  event_id: string;
  timestamp: string;
  repository_id: string;
  user_id: string;
  log: string;
  metadata: string | null;
};

export function isIndexingFinished(status: RepositoryStatus) {
  return status === "INDEXED" || status === "FAILED";
}
