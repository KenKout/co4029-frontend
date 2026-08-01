import { useTranslation } from "react-i18next";
import { MessageSquareText, Sparkles, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Button rail under an assistance turn: replay the question, open the
 * explain-a-term input, or spend the one available hint. */
export function InterviewerAssistanceActions({
  disabled,
  hintUsed,
  termOpen,
  onReplayQuestion,
  onToggleTerm,
  onRequestHint,
  onExplainTerm,
}: {
  disabled: boolean;
  hintUsed: boolean;
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
          disabled={disabled || hintUsed}
          onClick={onRequestHint}
          className="min-h-10 rounded-lg text-text-muted hover:text-primary"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {hintUsed
            ? t("course_interview.workspace.hint_provided")
            : t("course_interview.workspace.give_small_hint")}
        </Button>
      )}
    </div>
  );
}
