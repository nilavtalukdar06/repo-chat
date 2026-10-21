import {
  BookOpenIcon,
  KeyRoundIcon,
  NetworkIcon,
  TerminalIcon,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { PromptInput } from "./prompt-input";

const SUGGESTIONS: { icon: LucideIcon; label: string }[] = [
  { icon: NetworkIcon, label: "Explain the architecture of this repository" },
  { icon: KeyRoundIcon, label: "Where is authentication handled?" },
  { icon: TerminalIcon, label: "How do I run this project locally?" },
  { icon: BookOpenIcon, label: "Summarize the main modules" },
];

type EmptyChatProps = {
  onSubmit: (text: string) => void;
  disabled: boolean;
  repositoryPicker: ReactNode;
};

export function EmptyChat({
  onSubmit,
  disabled,
  repositoryPicker,
}: EmptyChatProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 pb-24">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-center text-2xl font-normal tracking-tight">
          What&apos;s on your mind today?
        </h1>
        <PromptInput
          autoFocus
          disabled={disabled}
          onSubmit={onSubmit}
          leading={repositoryPicker}
          placeholder={
            disabled
              ? "Select an indexed repository to start"
              : "Ask about this repository"
          }
        />
        <div className="flex flex-col gap-1 px-1">
          {SUGGESTIONS.map(({ icon: Icon, label }) => (
            <Button
              key={label}
              variant="ghost"
              className="justify-start gap-3 rounded-md font-light text-muted-foreground"
              disabled={disabled}
              onClick={() => onSubmit(label)}
            >
              <Icon />
              {label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
