import { Trace, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";
import { Spinner } from "@/components/ui/spinner";
import type { RetrievalStage } from "../types";

const STAGE_LABELS: Record<RetrievalStage, string> = {
  analyzing: "Understanding your question",
  searching: "Searching the codebase",
  reranking: "Ranking relevant code",
  generating: "Writing an answer",
};

export function ChatStatus({ stage }: { stage: RetrievalStage | null }) {
  return (
    <Trace>
      <TraceLine status="running">
        <TraceIcon>
          <Spinner />
        </TraceIcon>
        <TraceTitle className="font-light">
          {stage ? STAGE_LABELS[stage] : "Thinking"}
        </TraceTitle>
      </TraceLine>
    </Trace>
  );
}
