import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RepositoryStatus } from "../types";

const STATUS: Record<RepositoryStatus, { label: string; dot: string }> = {
  QUEUED: { label: "Queued", dot: "bg-amber-500" },
  INDEXING: { label: "Indexing", dot: "bg-blue-500 animate-pulse" },
  INDEXED: { label: "Indexed", dot: "bg-emerald-500" },
  FAILED: { label: "Failed", dot: "bg-red-500" },
};

export function RepositoryStatusBadge({
  status,
}: {
  status: RepositoryStatus;
}) {
  const { label, dot } = STATUS[status];

  return (
    <Badge variant="outline" className="rounded font-light">
      <span className={cn("size-1.5 rounded-full", dot)} />
      {label}
    </Badge>
  );
}
