export type Repository = {
  id: string;
  name: string;
  description: string | null;
  githubUrl: string;
  stars: number;
  language: string;
  status: string;
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
