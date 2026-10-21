import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type PromptInputProps = {
  onSubmit: (text: string) => void;
  onStop?: () => void;
  status?: "ready" | "submitted" | "streaming" | "error";
  disabled?: boolean;
  placeholder?: string;
  leading?: ReactNode;
  autoFocus?: boolean;
  className?: string;
};

export function PromptInput({
  onSubmit,
  onStop,
  status = "ready",
  disabled = false,
  placeholder = "Ask about this repository",
  leading,
  autoFocus,
  className,
}: PromptInputProps) {
  const [draft, setDraft] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const busy = status === "submitted" || status === "streaming";
  const canSend = draft.trim().length > 0 && !busy && !disabled;

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;
    onSubmit(draft.trim());
    setDraft("");
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={cn("w-full", className)}
    >
      <InputGroup
        className={cn(
          "rounded-2xl bg-background",
          !disabled && "has-disabled:bg-background has-disabled:opacity-100",
        )}
      >
        <InputGroupTextarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          aria-label="Message"
          autoFocus={autoFocus}
          className="max-h-48 min-h-12 font-light"
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        />
        <InputGroupAddon align="block-end" className="pt-0">
          {leading}
          {busy ? (
            <InputGroupButton
              type="button"
              variant="default"
              size="icon-sm"
              className="ml-auto rounded-full"
              aria-label="Stop generating"
              onClick={onStop}
            >
              {status === "submitted" ? (
                <Spinner />
              ) : (
                <SquareIcon className="fill-current" />
              )}
            </InputGroupButton>
          ) : (
            <InputGroupButton
              type="submit"
              variant="default"
              size="icon-sm"
              className="ml-auto rounded-full"
              aria-label="Send message"
              disabled={!canSend}
            >
              <ArrowUpIcon />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
