import { FolderGitIcon } from "lucide-react";
import type { ReactNode } from "react";
import { QueryError } from "@/components/query-error";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { useRepositories } from "../hooks";
import { RepositoryCard } from "./repository-card";

const GRID = "grid gap-3 sm:grid-cols-2 xl:grid-cols-3";

function RepositoryCardSkeleton() {
  return (
    <Card size="sm" className="rounded-md">
      <CardHeader className="gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </CardHeader>
      <CardContent className="flex gap-2">
        <Skeleton className="h-7 flex-1" />
        <Skeleton className="h-7 flex-1" />
      </CardContent>
    </Card>
  );
}

type RepositoryGridProps = {
  query: ReturnType<typeof useRepositories>;
  skeletonCount: number;
  search: string;
  emptyAction: ReactNode;
};

export function RepositoryGrid({
  query,
  skeletonCount,
  search,
  emptyAction,
}: RepositoryGridProps) {
  if (query.isPending) {
    return (
      <div className={GRID}>
        {Array.from({ length: skeletonCount }, (_, index) => (
          <RepositoryCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (query.isError && !query.data) {
    return (
      <QueryError
        title="Unable to load repositories"
        error={query.error}
        onRetry={() => void query.refetch()}
        isRetrying={query.isRefetching}
      />
    );
  }

  const repositories = query.data?.data ?? [];

  if (repositories.length === 0) {
    return (
      <Empty className="rounded-md border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderGitIcon />
          </EmptyMedia>
          <EmptyTitle className="font-normal">
            {search ? "No matching repositories" : "No repositories yet"}
          </EmptyTitle>
          <EmptyDescription className="font-light">
            {search
              ? `Nothing matches “${search}”.`
              : "Add a GitHub repository to start chatting with its code."}
          </EmptyDescription>
        </EmptyHeader>
        {search ? null : <EmptyContent>{emptyAction}</EmptyContent>}
      </Empty>
    );
  }

  return (
    <div className={cn(GRID, query.isPlaceholderData && "opacity-60")}>
      {repositories.map((repository) => (
        <RepositoryCard key={repository.id} repository={repository} />
      ))}
    </div>
  );
}
