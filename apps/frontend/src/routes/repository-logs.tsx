import { ArrowLeftIcon, MessageSquareIcon } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RepositoryLogs } from "@/features/repositories/components/repository-logs";
import { RepositoryStatusBadge } from "@/features/repositories/components/repository-status-badge";
import { useRepository } from "@/features/repositories/hooks";
import { isIndexingFinished } from "@/features/repositories/types";

export default function RepositoryLogsPage() {
  const { repositoryId = "" } = useParams();
  const navigate = useNavigate();
  const repository = useRepository(repositoryId);
  const data = repository.data;

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-3 p-4">
      <header className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-md"
          aria-label="Back to repositories"
          nativeButton={false}
          render={<Link to="/repositories" />}
        >
          <ArrowLeftIcon />
        </Button>
        {data ? (
          <>
            <h1 className="truncate text-base font-normal">{data.name}</h1>
            <RepositoryStatusBadge status={data.status} />
          </>
        ) : repository.isPending ? (
          <Skeleton className="h-5 w-40" />
        ) : null}
        <Button
          size="sm"
          className="ml-auto rounded-md font-light"
          disabled={data?.status !== "INDEXED"}
          onClick={() => void navigate(`/?repositoryId=${repositoryId}`)}
        >
          <MessageSquareIcon />
          Chat now
        </Button>
      </header>
      {repository.isError && !data ? (
        <QueryError
          title="Unable to load repository"
          error={repository.error}
          onRetry={() => void repository.refetch()}
          isRetrying={repository.isRefetching}
        />
      ) : (
        <RepositoryLogs
          repositoryId={repositoryId}
          isLive={!data || !isIndexingFinished(data.status)}
        />
      )}
    </div>
  );
}
