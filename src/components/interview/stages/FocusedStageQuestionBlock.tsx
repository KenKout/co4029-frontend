import type { ConversationTurn } from "@/lib/interview/types";
import { InterviewerAssistance } from "./InterviewerAssistance";
import { QuestionCard } from "./QuestionCard";
import type { QuestionTypeLabel, StageSpeak } from "./types";

/** The assessed branch of the stage: the active question card plus, when the
 * candidate asked for help, the clarification/hint card beneath it. */
export function FocusedStageQuestionBlock({
  activeTurn,
  assistanceTurn,
  currentQuestionNumber,
  totalQuestions,
  currentQuestionType,
  questionTypeLabel,
  speak,
  onSpeakingChange,
  onRequestHint,
  onExplainTerm,
  presentedAiTurnIds,
  replayBlocked,
  replayingTurnId,
  hintsUsed,
  markPresented,
  replayTurn,
  agentSpeaks = false,
}: {
  activeTurn: ConversationTurn;
  assistanceTurn: ConversationTurn | null;
  currentQuestionNumber: number;
  totalQuestions: number | null | undefined;
  currentQuestionType: string | null | undefined;
  questionTypeLabel: QuestionTypeLabel;
  speak: StageSpeak;
  onSpeakingChange: (speaking: boolean) => void;
  onRequestHint: (() => void) | undefined;
  onExplainTerm: ((term: string) => void) | undefined;
  presentedAiTurnIds: ReadonlySet<string>;
  replayBlocked: boolean;
  replayingTurnId: string | null;
  hintsUsed: number;
  markPresented: (turn: ConversationTurn) => void;
  replayTurn: (turn: ConversationTurn) => Promise<void>;
  /** The LiveKit agent voices this turn — mirror its synced transcript. */
  agentSpeaks?: boolean;
}) {
  return (
    <div className="space-y-3">
      <QuestionCard
        key={activeTurn.id}
        turn={activeTurn}
        questionNumber={currentQuestionNumber}
        totalQuestions={totalQuestions}
        category={
          questionTypeLabel(activeTurn.questionType) ??
          questionTypeLabel(currentQuestionType)
        }
        speak={speak}
        agentSpeaks={agentSpeaks}
        onSpeakingChange={onSpeakingChange}
        onPresentationComplete={() => markPresented(activeTurn)}
        animate={!assistanceTurn}
      />
      {assistanceTurn && (
        <InterviewerAssistance
          key={assistanceTurn.id}
          turn={assistanceTurn}
          speak={speak}
          onSpeakingChange={onSpeakingChange}
          onPresentationComplete={() => markPresented(assistanceTurn)}
          actionsVisible={presentedAiTurnIds.has(assistanceTurn.id)}
          disabled={replayBlocked || replayingTurnId !== null}
          hintsUsed={hintsUsed}
          onReplayQuestion={() => void replayTurn(activeTurn)}
          onRequestHint={onRequestHint}
          onExplainTerm={onExplainTerm}
        />
      )}
    </div>
  );
}
