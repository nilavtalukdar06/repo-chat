import { ChevronsUpDownIcon, LogOutIcon } from "lucide-react";
import { QueryError } from "@/components/query-error";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useLogout, useSession } from "../hooks";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function NavUser() {
  const session = useSession();
  const logout = useLogout();
  const user = session.data;

  if (!user) {
    return session.isError ? (
      <QueryError
        title="Unable to load your profile"
        error={session.error}
        onRetry={() => void session.refetch()}
        isRetrying={session.isRefetching}
      />
    ) : (
      <div className="flex h-12 items-center gap-3 px-2">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="gap-3 rounded data-open:bg-sidebar-accent"
              />
            }
          >
            <Avatar>
              <AvatarFallback className="bg-purple-600 text-xs font-medium text-white">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
            <ChevronsUpDownIcon className="ml-auto text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="rounded">
            <DropdownMenuItem
              className="gap-3 rounded px-3 text-red-500! hover:text-red-600! hover:bg-red-50!"
              disabled={logout.isPending}
              closeOnClick={false}
              onClick={() => logout.mutate()}
            >
              {logout.isPending ? (
                <Spinner />
              ) : (
                <LogOutIcon className="hover:text-red-600! text-red-600!" />
              )}
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
