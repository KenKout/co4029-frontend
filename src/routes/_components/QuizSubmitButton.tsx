import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardCooldownBadge } from "@/components/ui/card-cooldown-badge";
import { useCardCooldown } from "@/lib/api/cooldown";

/**
 * The Next / Submit control for the quiz footer.
 *
 * Answers auto-save (see use-auto-save-answer), so the old explicit Save
 * button is gone and Continue is just "Next" — the primary action persists
 * the current answer (a no-op when it's already saved) and advances, or
 * final-submits on the last question.
 */
export function QuizSubmitButton({
  isLastQuestion,
  hasSelection,
  isSavingAnswer,
  isFinalSubmitting,
  cooldownRetryAt: cooldownAt,
  onNext,
  onFinalSubmit,
}: {
  isLastQuestion: boolean;
  hasSelection: boolean;
  isSavingAnswer: boolean;
  isFinalSubmitting: boolean;
  cooldownRetryAt: string | null;
  onNext: () => void;
  onFinalSubmit: () => void;
}) {
  const { t } = useTranslation();
  const cooldown = useCardCooldown(cooldownAt);
  const cooldownActive = !!cooldownAt && !cooldown.isExpired;
  const busy = isSavingAnswer || isFinalSubmitting;
  const primaryDisabled = busy || cooldownActive;

  return (
    <div className="flex items-center gap-3 flex-wrap justify-end">
      {cooldownActive && <CardCooldownBadge retryAt={cooldownAt} />}
      {isLastQuestion ? (
        <Button
          onClick={onFinalSubmit}
          disabled={primaryDisabled || !hasSelection}
          className="gradient-primary text-white font-bold rounded-xl gap-2 shadow-ai-glow px-3 sm:px-6 py-2.5 sm:py-3 h-auto hover:opacity-90 active:scale-95 transition-all"
          aria-label={t("course_quiz.actions.submit")}
        >
          <span className="hidden sm:inline">
            {isFinalSubmitting
              ? t("course_quiz.actions.submitting")
              : isSavingAnswer
                ? t("course_quiz.actions.saving")
                : t("course_quiz.actions.submit")}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Button>
      ) : (
        <Button
          onClick={onNext}
          disabled={primaryDisabled}
          className="gradient-primary text-white font-bold rounded-xl gap-2 shadow-ai-glow px-3 sm:px-6 py-2.5 sm:py-3 h-auto hover:opacity-90 active:scale-95 transition-all"
          aria-label={t("course_quiz.actions.next")}
        >
          <span className="hidden sm:inline">
            {isSavingAnswer
              ? t("course_quiz.actions.saving")
              : t("course_quiz.actions.next")}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Button>
      )}
    </div>
  );
}
