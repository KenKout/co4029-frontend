import type {
  ConversationTurn,
  InterviewAgentStatus,
} from "@/lib/interview/types";
import { InterviewerAssistance } from "./InterviewerAssistance";
import { QuestionCard } from "./QuestionCard";
import type { QuestionTypeLabel, StageSpeak } from "./types";

/** The assessed branch of the stage: the active question card plus, when the
 * candidate asked for help, the clarification/hint card beneath it. */
export function FocusedStageQuestionBlock({
  activeTurn,
  assistanceTurn,
  status,
  currentQuestionNumber,
  totalQuestions,
  currentQuestionType,
  questionTypeLabel,
  speak,
  onSpeakingChange,
  onClarifyQuestion,
  onRequestHint,
  onExplainTerm,
  presentedAiTurnIds,
  replayBlocked,
  replayingTurnId,
  hintUsed,
  markPresented,
  replayTurn,
}: {
  activeTurn: ConversationTurn;
  assistanceTurn: ConversationTurn | null;
  status: InterviewAgentStatus;
  currentQuestionNumber: number;
  totalQuestions: number | null | undefined;
  currentQuestionType: string | null | undefined;
  questionTypeLabel: QuestionTypeLabel;
  speak: StageSpeak;
  onSpeakingChange: (speaking: boolean) => void;
  onClarifyQuestion: (() => void) | undefined;
  onRequestHint: (() => void) | undefined;
  onExplainTerm: ((term: string) => void) | undefined;
  presentedAiTurnIds: ReadonlySet<string>;
  replayBlocked: boolean;
  replayingTurnId: string | null;
  hintUsed: boolean;
  markPresented: (turn: ConversationTurn) => void;
  replayTurn: (turn: ConversationTurn) => Promise<void>;
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
        onSpeakingChange={onSpeakingChange}
        onPresentationComplete={() => markPresented(activeTurn)}
        onReplay={() => void replayTurn(activeTurn)}
        onClarify={onClarifyQuestion}
        animate={!assistanceTurn}
        replayDisabled={
          replayBlocked ||
          !presentedAiTurnIds.has(activeTurn.id) ||
          replayingTurnId !== null
        }
        clarificationDisabled={
          status === "thinking" ||
          status === "speaking" ||
          status === "listening" ||
          status === "disconnected"
        }
        isReplaying={replayingTurnId === activeTurn.id}
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
          hintUsed={hintUsed}
          onReplayQuestion={() => void replayTurn(activeTurn)}
          onRequestHint={onRequestHint}
          onExplainTerm={onExplainTerm}
        />
      )}
    </div>
  );
}
