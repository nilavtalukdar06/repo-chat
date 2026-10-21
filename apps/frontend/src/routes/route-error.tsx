import { QueryError } from "@/components/query-error";
import { useRouteError } from "react-router";

export default function RouteError() {
  const error = useRouteError();

  return (
    <main className="flex min-h-svh items-center justify-center px-6">
      <QueryError
        className="max-w-md"
        title="Unable to load this page"
        error={error}
        onRetry={() => window.location.reload()}
      />
    </main>
  );
}
