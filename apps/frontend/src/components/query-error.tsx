import { TriangleAlertIcon } from "lucide-react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/lib/api-error";

type QueryErrorProps = {
  error: unknown;
  onRetry: () => void;
  isRetrying?: boolean;
  title?: string;
  className?: string;
};

export function QueryError({
  error,
  onRetry,
  isRetrying = false,
  title = "Something went wrong",
  className,
}: QueryErrorProps) {
  return (
    <Alert variant="destructive" className={className}>
      <TriangleAlertIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{getErrorMessage(error)}</AlertDescription>
      <AlertAction>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
        >
          {isRetrying ? <Spinner /> : "Retry"}
        </Button>
      </AlertAction>
    </Alert>
  );
}
