import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton() {
  return (
    <div className="flex min-h-svh w-full flex-col gap-4 p-4">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-9 w-24 rounded-full" />
    </div>
  );
}
