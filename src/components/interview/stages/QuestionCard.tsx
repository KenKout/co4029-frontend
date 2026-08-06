import { useState } from "react";

import { QuestionCardActions } from "./QuestionCardActions";
import { QuestionCardHeader } from "./QuestionCardHeader";
import { QuestionCardPrompt } from "./QuestionCardPrompt";
import type { QuestionCardProps } from "./types";

/**
 * The prominent card carrying the question the candidate is answering right
 * now. Re-exported from `../stages` so importers and tests keep the old path.
 */
export function QuestionCard({
  turn,
  questionNumber,
  totalQuestions,
  category,
  speak,
  onSpeakingChange,
  onPresentationComplete,
  onReplay,
  onClarify,
  animate = true,
  replayDisabled = false,
  clarificationDisabled = false,
  isReplaying = false,
  agentSpeaks = false,
  agentTranscriptions,
}: QuestionCardProps) {
  const [presentationComplete, setPresentationComplete] = useState(!animate);

  return (
    <article
      // 200ms / 8px, matching MessageTurnActions and UserTypingIndicator — the
      // idiom this screen already uses for in-conversation beats. The shared
      // `fade-in-up` utility is 0.7s and lifts 32px, which is right for a page
      // card but reads as sluggish for a chat turn arriving mid-exchange.
      className="rounded-2xl border border-border bg-white px-5 py-5 shadow-editorial motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-safe:ease-out sm:px-7 sm:py-7"
      aria-labelledby={`question-${turn.id}`}
    >
      <QuestionCardHeader
        turn={turn}
        questionNumber={questionNumber}
        totalQuestions={totalQuestions}
        category={category}
      />

      <QuestionCardPrompt
        turn={turn}
        animate={animate}
        speak={speak}
        agentSpeaks={agentSpeaks}
        agentTranscriptions={agentTranscriptions}
        onSpeakingChange={onSpeakingChange}
        onPresentationComplete={() => {
          setPresentationComplete(true);
          onPresentationComplete();
        }}
      />

      <QuestionCardActions
        presentationComplete={presentationComplete}
        replayDisabled={replayDisabled}
        clarificationDisabled={clarificationDisabled}
        isReplaying={isReplaying}
        onReplay={onReplay}
        onClarify={onClarify}
      />
    </article>
  );
}
