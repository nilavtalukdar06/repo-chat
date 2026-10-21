import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useLogout, useSession } from "@/features/auth/hooks";

export default function Home() {
  const { data: user } = useSession();
  const logout = useLogout();

  return (
    <div className="flex w-full flex-col items-start gap-4 p-4">
      <p className="text-sm font-light">Signed in as {user?.name}</p>
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
