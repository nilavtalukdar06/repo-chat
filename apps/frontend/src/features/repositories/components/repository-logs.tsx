import { useEffect, useRef } from "react";
import { QueryError } from "@/components/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useRepositoryLogs } from "../hooks";

const STICK_THRESHOLD_PX = 48;

function formatTime(timestamp: string) {
  const iso = timestamp.includes("T")
    ? timestamp
    : `${timestamp.replace(" ", "T")}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? timestamp
    : date.toLocaleTimeString([], { hour12: false });
}

export function RepositoryLogs({
  repositoryId,
  isLive,
}: {
  repositoryId: string;
  isLive: boolean;
}) {
  const logs = useRepositoryLogs(repositoryId);
  const containerRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const count = logs.data?.length ?? 0;

  useEffect(() => {
    const node = containerRef.current;
    if (!node || !stickToBottomRef.current) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [count]);

  function handleScroll() {
    const node = containerRef.current;
    if (!node) return;
    stickToBottomRef.current =
      node.scrollHeight - node.scrollTop - node.clientHeight <
      STICK_THRESHOLD_PX;
  }

  if (logs.isPending) {
    return (
      <div className="flex flex-col gap-2 rounded-md border p-3">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-3" />
        ))}
      </div>
    );
  }

  if (logs.isError && !logs.data) {
    return (
      <QueryError
        title="Unable to load logs"
        error={logs.error}
        onRetry={() => void logs.refetch()}
        isRetrying={logs.isRefetching}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto rounded-md border bg-muted/30 p-3 font-mono text-xs font-light leading-relaxed"
    >
      {count === 0 ? (
        <p className="text-muted-foreground">Waiting for logs…</p>
      ) : (
        logs.data?.map((entry) => (
          <div key={entry.event_id} className="flex gap-3">
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {formatTime(entry.timestamp)}
            </span>
            <span className="break-all whitespace-pre-wrap">{entry.log}</span>
          </div>
        ))
      )}
      {isLive ? (
        <div className="mt-2 flex items-center gap-2 text-muted-foreground">
          <Spinner className="size-3" />
          Indexing…
        </div>
      ) : null}
    </div>
  );
}
