import type { ReactNode } from "react";

import { ConversationMessage } from "@/components/interview/conversation";
import type { ConversationTurn } from "@/lib/interview/types";
import type { QuestionTypeLabel, StageSpeak } from "./types";

/** The pre-assessment branch of the stage: the onboarding turn rendered as a
 * plain conversation message with its response choices attached. */
export function FocusedStageOnboardingTurn({
  activeTurn,
  questionTypeLabel,
  speak,
  onSpeakingChange,
  activeTurnActions,
  activeTurnActionsVisible,
  presentedAiTurnIds,
  replayAvailable,
  replayBlocked,
  replayingTurnId,
  markPresented,
  replayTurn,
}: {
  activeTurn: ConversationTurn;
  questionTypeLabel: QuestionTypeLabel;
  speak: StageSpeak;
  onSpeakingChange: (speaking: boolean) => void;
  activeTurnActions: ReactNode;
  activeTurnActionsVisible: boolean;
  presentedAiTurnIds: ReadonlySet<string>;
  replayAvailable: boolean;
  replayBlocked: boolean;
  replayingTurnId: string | null;
  markPresented: (turn: ConversationTurn) => void;
  replayTurn: (turn: ConversationTurn) => Promise<void>;
}) {
  return (
    <section className="rounded-2xl border border-border bg-white px-5 py-5 shadow-editorial sm:px-7 sm:py-7">
      <ConversationMessage
        key={activeTurn.id}
        turn={activeTurn}
        label={questionTypeLabel(activeTurn.questionType)}
        isLatest
        speak={speak}
        onTick={() => undefined}
        onSpeakingChange={onSpeakingChange}
        onPresentationComplete={() => markPresented(activeTurn)}
        actions={activeTurnActions}
        actionsVisible={
          presentedAiTurnIds.has(activeTurn.id) && activeTurnActionsVisible
        }
        replayVisible={replayAvailable && presentedAiTurnIds.has(activeTurn.id)}
        replayDisabled={replayBlocked || replayingTurnId !== null}
        isReplaying={replayingTurnId === activeTurn.id}
        onReplay={() => void replayTurn(activeTurn)}
      />
    </section>
  );
}
