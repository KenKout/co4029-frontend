import { useTranslation } from "react-i18next";
import { MessageSquareText, Sparkles, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  hintLadderExhausted,
  hintsRemaining,
} from "@/lib/interview/hint-ladder";

/** Button rail under an assistance turn: replay the question, open the
 * explain-a-term input, or spend a rung of the question's hint ladder. */
export function InterviewerAssistanceActions({
  disabled,
  hintsUsed,
  termOpen,
  onReplayQuestion,
  onToggleTerm,
  onRequestHint,
  onExplainTerm,
}: {
  disabled: boolean;
  /** Hints already given on the current question; the ladder resets per question. */
  hintsUsed: number;
  termOpen: boolean;
  onReplayQuestion: () => void;
  onToggleTerm: () => void;
  onRequestHint: (() => void) | undefined;
  onExplainTerm: ((term: string) => void) | undefined;
}) {
  const { t } = useTranslation();

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-primary/10 pt-3 sm:pl-11">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={onReplayQuestion}
        className="min-h-10 rounded-lg text-text-muted hover:text-primary"
      >
        <Volume2 className="h-4 w-4" aria-hidden="true" />
        {t("course_interview.workspace.replay")}
      </Button>
      {onExplainTerm && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={onToggleTerm}
          aria-expanded={termOpen}
          className="min-h-10 rounded-lg text-text-muted hover:text-primary"
        >
          <MessageSquareText className="h-4 w-4" aria-hidden="true" />
          {t("course_interview.workspace.explain_term")}
        </Button>
      )}
      {onRequestHint && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || hintLadderExhausted(hintsUsed)}
          onClick={onRequestHint}
          className="min-h-10 rounded-lg text-text-muted hover:text-primary"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {hintLadderExhausted(hintsUsed)
            ? t("course_interview.workspace.hint_provided")
            : t("course_interview.workspace.give_small_hint")}
          {/* Each rung is a harder hint, so "how many are left" is information the
              candidate needs to decide whether to spend one. Hidden on the first
              rung, where the count would just be noise. */}
          {hintsUsed > 0 && !hintLadderExhausted(hintsUsed) && (
            <span className="text-[11px] font-semibold tabular-nums text-text-subtle">
              {t("course_interview.workspace.hints_left", {
                count: hintsRemaining(hintsUsed),
              })}
            </span>
          )}
        </Button>
      )}
    </div>
  );
}
