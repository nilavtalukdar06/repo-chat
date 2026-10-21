import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { Markdown } from "@/components/markdown";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  Message,
  MessageContent,
  MessageFooter,
} from "@/components/ui/message";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ChatSource, RetrievalStage } from "../types";
import { ChatSources } from "./chat-sources";
import { ChatStatus } from "./chat-status";

const COPIED_RESET_MS = 2000;

export function UserMessage({ text }: { text: string }) {
  return (
    <Message align="end">
      <MessageContent>
        <Bubble align="end" variant="muted">
          <BubbleContent className="font-light whitespace-pre-wrap">
            {text}
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), COPIED_RESET_MS);
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-md text-muted-foreground"
            aria-label={copied ? "Copied" : "Copy"}
            onClick={() => void handleCopy()}
          />
        }
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied" : "Copy"}</TooltipContent>
    </Tooltip>
  );
}

type AssistantMessageProps = {
  text: string;
  sources?: ChatSource[];
  githubUrl?: string;
  streaming: boolean;
  stage: RetrievalStage | null;
};

export function AssistantMessage({
  text,
  sources,
  githubUrl,
  streaming,
  stage,
}: AssistantMessageProps) {
  return (
    <Message>
      <MessageContent className="gap-3">
        {sources?.length ? (
          <ChatSources sources={sources} githubUrl={githubUrl} />
        ) : null}
        {text ? (
          <Markdown isAnimating={streaming}>{text}</Markdown>
        ) : streaming ? (
          <ChatStatus stage={stage} />
        ) : null}
        {text && !streaming ? (
          <MessageFooter>
            <CopyButton text={text} />
          </MessageFooter>
        ) : null}
      </MessageContent>
    </Message>
  );
}
