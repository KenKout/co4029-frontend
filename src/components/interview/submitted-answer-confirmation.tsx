import { useId, useState } from "react";

import {
  FailedAnswerCard,
  PreviousAnswerAcknowledgement,
  SubmittedAnswerCard,
  SubmittingAnswerCard,
} from "@/components/interview/submitted-answer-confirmation/state-cards";

/**
 * Compact main-screen confirmation for the most recently submitted answer
 * (interview main-screen spec §8).
 *
 * Visually SECONDARY to the Question Card: a subtle success rail with a 2–3
 * line answer preview, never a large candidate chat bubble and never something
 * that reads as a second active input. The full answer stays in the Transcript
 * drawer; this card exposes an expand/collapse for a quick in-place peek plus a
 * "View full answer" action that opens the drawer.
 *
 * Three visual states, driven by `status`:
 *  - `submitted`   → ✓ success rail + preview + View full answer
 *  - `processing`  → success rail with an "Analyzing your answer…" note
 *  - `failed`      → danger rail, preserved-answer note, Try again / keep editing
 *
 * Each state's layout lives in `./submitted-answer-confirmation/state-cards`;
 * this component owns the expand state and routes to one of them.
 */
export type SubmittedAnswerConfirmationStatus =
  | "submitting"
  | "submitted"
  | "processing"
  | "failed";

export interface SubmittedAnswerConfirmationProps {
  status: SubmittedAnswerConfirmationStatus;
  /** The submitted (or attempted) answer text; preview is derived from it. */
  answer: string;
  /** Opens the Transcript drawer at the full answer. */
  onViewFullAnswer?: () => void;
  /** Failure-state retry (reuses the same submissionId — no duplicate turn). */
  onRetry?: () => void;
  /** Failure-state "keep editing" — returns focus to the composer. */
  onContinueEditing?: () => void;
  /** Optional submitted-at label (already formatted) shown when useful. */
  timestamp?: string;
  /**
   * Collapsed "✓ Previous answer submitted" form (spec §2 next-question state):
   * once the next question is active the confirmation shrinks to a single line
   * and drops the inline preview, keeping the workspace focused on the new
   * question while still acknowledging the prior answer.
   */
  previous?: boolean;
  className?: string;
}

export function SubmittedAnswerConfirmation({
  status,
  answer,
  onViewFullAnswer,
  onRetry,
  onContinueEditing,
  timestamp,
  previous = false,
  className,
}: SubmittedAnswerConfirmationProps) {
  const [expanded, setExpanded] = useState(false);
  const previewId = useId();
  const trimmed = answer.trim();

  if (status === "submitting") {
    return <SubmittingAnswerCard trimmed={trimmed} className={className} />;
  }

  if (status === "failed") {
    return (
      <FailedAnswerCard
        onRetry={onRetry}
        onContinueEditing={onContinueEditing}
        className={className}
      />
    );
  }

  if (previous) {
    return (
      <PreviousAnswerAcknowledgement
        onViewFullAnswer={onViewFullAnswer}
        className={className}
      />
    );
  }

  const processing = status === "processing";

  return (
    <SubmittedAnswerCard
      trimmed={trimmed}
      previewId={previewId}
      expanded={expanded}
      onToggleExpanded={() => setExpanded((open) => !open)}
      onViewFullAnswer={onViewFullAnswer}
      timestamp={timestamp}
      processing={processing}
      className={className}
    />
  );
}

export default SubmittedAnswerConfirmation;
