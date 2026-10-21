import {
  CheckIcon,
  ChevronDownIcon,
  FolderGitIcon,
  PlusIcon,
} from "lucide-react";
import { Link } from "react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroupButton } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { Repository } from "@/features/repositories/types";

type RepositoryPickerProps = {
  repositories: Repository[];
  selected: Repository | undefined;
  isPending: boolean;
  isError: boolean;
  isRetrying: boolean;
  onRetry: () => void;
  onSelect: (id: string) => void;
};

export function RepositoryPicker({
  repositories,
  selected,
  isPending,
  isError,
  isRetrying,
  onRetry,
  onSelect,
}: RepositoryPickerProps) {
  if (isPending) {
    return <Skeleton className="h-7 w-32 rounded" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <InputGroupButton
            type="button"
            variant="ghost"
            size="sm"
            className="max-w-56 rounded font-light text-muted-foreground"
          />
        }
      >
        <FolderGitIcon />
        <span className="truncate">
          {selected?.name ?? "Select repository"}
        </span>
        <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-64 rounded">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-light">
            Indexed repositories
          </DropdownMenuLabel>
          {isError ? (
            <DropdownMenuItem
              className="font-light text-destructive"
              closeOnClick={false}
              disabled={isRetrying}
              onClick={onRetry}
            >
              {isRetrying ? <Spinner /> : null}
              Unable to load. Retry
            </DropdownMenuItem>
          ) : repositories.length === 0 ? (
            <DropdownMenuItem disabled className="font-light">
              No indexed repositories yet
            </DropdownMenuItem>
          ) : (
            repositories.map((repository) => (
              <DropdownMenuItem
                key={repository.id}
                className="font-light"
                onClick={() => onSelect(repository.id)}
              >
                <FolderGitIcon />
                <span className="truncate">{repository.name}</span>
                {repository.id === selected?.id ? (
                  <CheckIcon className="ml-auto" />
                ) : null}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="font-light"
          render={<Link to="/repositories" />}
        >
          <PlusIcon />
          Add repository
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
