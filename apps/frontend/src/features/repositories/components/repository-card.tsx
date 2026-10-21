import { MessageSquareIcon, ScrollTextIcon, StarIcon } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Repository } from "../types";
import { RepositoryStatusBadge } from "./repository-status-badge";

const compactNumber = new Intl.NumberFormat("en", { notation: "compact" });

export function RepositoryCard({ repository }: { repository: Repository }) {
  const navigate = useNavigate();
  const canChat = repository.status === "INDEXED";

  return (
    <Card size="sm" className="rounded-md">
      <CardHeader>
        <CardTitle className="truncate font-normal">
          {repository.name}
        </CardTitle>
        <CardAction>
          <RepositoryStatusBadge status={repository.status} />
        </CardAction>
        <CardDescription className="line-clamp-2 min-h-8 text-xs font-light">
          {repository.description ?? "No description"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3 text-xs font-light text-muted-foreground">
        <span>{repository.language}</span>
        <span className="flex items-center gap-1">
          <StarIcon size={12} />
          {compactNumber.format(repository.stars)}
        </span>
      </CardContent>
      <CardFooter className="gap-2 rounded-b-md">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded font-light"
          nativeButton={false}
          render={<Link to={`/repositories/${repository.id}/logs`} />}
        >
          <ScrollTextIcon />
          Check logs
        </Button>
        <Button
          size="sm"
          className="flex-1 rounded font-light"
          disabled={!canChat}
          title={canChat ? undefined : "Available once indexing completes"}
          onClick={() => void navigate(`/?repositoryId=${repository.id}`)}
        >
          <MessageSquareIcon />
          Chat now
        </Button>
      </CardFooter>
    </Card>
  );
}
