import { toast } from "@/components/ui/toast";
import { getErrorMessage, getFieldErrors } from "@/lib/api-error";

export function toastError(error: unknown, title: string) {
  const [fieldError] = Object.values(getFieldErrors(error));
  toast.add({
    type: "error",
    title,
    description: fieldError ?? getErrorMessage(error),
    priority: "high",
  });
}
