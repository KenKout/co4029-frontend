import { VoiceStatusIndicator } from "@/components/interview/conversation";
import type { InterviewAgentStatus } from "@/lib/interview/types";

/**
 * Status rail under the stage: the agent's state and its retry affordance.
 *
 * It used to carry a "View interview transcript" trigger as well. The stage
 * already renders the whole conversation inline (question card + history), so
 * that opened a second copy of what was on screen — and the copy was the
 * incomplete one, since the drawer never received the agent's live utterances.
 * One surface, no duplicate.
 */
export function FocusedStageStatusBar({
  status,
  statusMessage,
  onRetry,
}: {
  status: InterviewAgentStatus;
  statusMessage: string | undefined;
  onRetry: (() => void) | undefined;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
      <VoiceStatusIndicator
        status={status}
        message={statusMessage}
        onRetry={onRetry}
        className="min-w-0 flex-1"
      />
    </div>
  );
}
