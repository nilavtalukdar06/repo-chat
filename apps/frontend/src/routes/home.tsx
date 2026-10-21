import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useLogout, useSession } from "@/features/auth/hooks";

function SessionSummary() {
  const session = useSession();

  if (session.isPending) {
    return <Skeleton className="h-5 w-48" />;
  }

  if (session.isError) {
    return (
      <QueryError
        title="Unable to load your profile"
        error={session.error}
        onRetry={() => void session.refetch()}
        isRetrying={session.isRefetching}
      />
    );
  }

  return (
    <p className="text-sm font-light">Signed in as {session.data?.name}</p>
  );
}

export default function Home() {
  const logout = useLogout();

  return (
    <div className="flex w-full flex-col items-start gap-4 p-4">
      <SessionSummary />
      <Button
        variant="outline"
        className="rounded-full"
        disabled={logout.isPending}
        onClick={() => logout.mutate()}
      >
        {logout.isPending ? <Spinner /> : "Sign out"}
      </Button>
    </div>
  );
}
