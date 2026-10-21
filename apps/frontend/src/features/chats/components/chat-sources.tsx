import { ArrowUpRightIcon, FileCodeIcon, FilesIcon } from "lucide-react";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";
import type { ChatSource } from "../types";

function getSourceUrl(githubUrl: string, source: ChatSource) {
  const base = githubUrl.replace(/\/$/, "");
  return `${base}/blob/HEAD/${source.path}#L${source.startLine}-L${source.endLine}`;
}

export function ChatSources({
  sources,
  githubUrl,
}: {
  sources: ChatSource[];
  githubUrl?: string;
}) {
  const unique = sources.filter(
    (source, index, all) =>
      all.findIndex(
        (other) =>
          other.path === source.path && other.startLine === source.startLine,
      ) === index,
  );

  return (
    <Trace>
      <TraceCollapsible>
        <TraceCollapsibleTrigger>
          <TraceLine>
            <TraceIcon>
              <FilesIcon />
            </TraceIcon>
            <TraceTitle className="font-light">
              Read {unique.length}{" "}
              {unique.length === 1 ? "snippet" : "snippets"}
            </TraceTitle>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <Trace>
            {unique.map((source) => {
              const line = (
                <TraceLine>
                  <TraceIcon>
                    <FileCodeIcon />
                  </TraceIcon>
                  <TraceTitle className="font-mono text-xs font-light">
                    {source.path}
                  </TraceTitle>
                  <TraceDescription className="text-xs">
                    L{source.startLine}–{source.endLine}
                  </TraceDescription>
                  {githubUrl ? (
                    <TraceIcon>
                      <ArrowUpRightIcon />
                    </TraceIcon>
                  ) : null}
                </TraceLine>
              );
              return githubUrl ? (
                <a
                  key={`${source.path}:${source.startLine}`}
                  href={getSourceUrl(githubUrl, source)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {line}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <div key={`${source.path}:${source.startLine}`}>{line}</div>
              );
            })}
          </Trace>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
  );
}
