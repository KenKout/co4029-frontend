import { VoiceStatusIndicator } from "@/components/interview/conversation";
import { TranscriptDrawer } from "@/components/interview/transcript";
import type {
  ConversationTurn,
  InterviewAgentStatus,
} from "@/lib/interview/types";
import type { QuestionTypeLabel, StageSpeak } from "./types";

/** Status rail under the stage: agent state plus the transcript trigger. */
export function FocusedStageStatusBar({
  status,
  statusMessage,
  onRetry,
  transcript,
  transcriptOpen,
  transcriptDocked,
  onTranscriptOpenChange,
  presentedAiTurnIds,
  questionTypeLabel,
  speak,
  onSpeakingChange,
  replayBlocked,
  replayingTurnId,
  replayTurn,
}: {
  status: InterviewAgentStatus;
  statusMessage: string | undefined;
  onRetry: (() => void) | undefined;
  transcript: ConversationTurn[];
  transcriptOpen: boolean;
  transcriptDocked: boolean;
  onTranscriptOpenChange: (open: boolean) => void;
  presentedAiTurnIds: ReadonlySet<string>;
  questionTypeLabel: QuestionTypeLabel;
  speak: StageSpeak;
  onSpeakingChange: (speaking: boolean) => void;
  replayBlocked: boolean;
  replayingTurnId: string | null;
  replayTurn: (turn: ConversationTurn) => Promise<void>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
      <VoiceStatusIndicator
        status={status}
        message={statusMessage}
        onRetry={onRetry}
        className="min-w-0 flex-1"
      />
      {/* The trigger stays visible at every breakpoint and simply flips
          `transcriptOpen`. Which surface shows is decided by breakpoint: on
          desktop (`transcriptDocked`) the route renders an in-flow docked
          panel and the overlay Sheet is suppressed, so the two can never
          show at once. */}
      <TranscriptDrawer
        open={transcriptOpen && !transcriptDocked}
        onOpenChange={onTranscriptOpenChange}
        transcript={transcript}
        presentedAiTurnIds={presentedAiTurnIds}
        questionTypeLabel={questionTypeLabel}
        speak={speak}
        onSpeakingChange={onSpeakingChange}
        onReplay={(turn) => void replayTurn(turn)}
        replayDisabled={replayBlocked}
        replayingTurnId={replayingTurnId}
      />
    </div>
  );
}
