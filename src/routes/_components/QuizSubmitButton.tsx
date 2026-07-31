import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardCooldownBadge } from "@/components/ui/card-cooldown-badge";
import { useCardCooldown } from "@/lib/api/cooldown";

/**
 * The Save / Continue / Submit control cluster shown under the active question.
 * Owns the cooldown gating so the taking page doesn't have to: while a card
 * cooldown is live, the primary action is disabled and a countdown badge shows.
 */
export function QuizSubmitButton({
  isLastQuestion,
  hasSelection,
  isSaved,
  isSavingAnswer,
  isFinalSubmitting,
  cooldownRetryAt: cooldownAt,
  onSave,
  onSaveNext,
  onFinalSubmit,
}: {
  isLastQuestion: boolean;
  hasSelection: boolean;
  isSaved: boolean;
  isSavingAnswer: boolean;
  isFinalSubmitting: boolean;
  cooldownRetryAt: string | null;
  onSave: () => void;
  onSaveNext: () => void;
  onFinalSubmit: () => void;
}) {
  const { t } = useTranslation();
  const cooldown = useCardCooldown(cooldownAt);
  const cooldownActive = !!cooldownAt && !cooldown.isExpired;
  const busy = isSavingAnswer || isFinalSubmitting;
  const primaryDisabled = !hasSelection || busy || cooldownActive;
  // Save (secondary) is additionally suppressed once the current answer is
  // already persisted — there's nothing new to write. Continue/Submit stay
  // enabled so the student can still advance without a redundant save.
  const saveDisabled = primaryDisabled || isSaved;

  // Secondary "Save" — persists the current answer in place, no navigation.
  const saveButton = (
    <Button
      variant="outline"
      onClick={onSave}
      disabled={saveDisabled}
      className="font-bold rounded-xl gap-2 px-5 py-3 h-auto border-m3-primary/40 text-m3-primary hover:bg-m3-primary-fixed/30 active:scale-95 transition-all disabled:opacity-50"
    >
      {isSavingAnswer
        ? t("course_quiz.actions.saving")
        : isSaved
          ? t("course_quiz.actions.saved")
          : t("course_quiz.actions.save")}
    </Button>
  );

  return (
    <div className="flex items-center gap-3 flex-wrap justify-end">
      {cooldownActive && <CardCooldownBadge retryAt={cooldownAt} />}
      {saveButton}
      {isLastQuestion ? (
        <Button
          onClick={onFinalSubmit}
          disabled={primaryDisabled}
          className="gradient-primary text-white font-bold rounded-xl gap-2 shadow-ai-glow px-6 py-3 h-auto hover:opacity-90 active:scale-95 transition-all"
        >
          {isFinalSubmitting
            ? t("course_quiz.actions.submitting")
            : isSavingAnswer
              ? t("course_quiz.actions.saving")
              : t("course_quiz.actions.submit")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          onClick={onSaveNext}
          disabled={primaryDisabled}
          className="gradient-primary text-white font-bold rounded-xl gap-2 shadow-ai-glow px-6 py-3 h-auto hover:opacity-90 active:scale-95 transition-all"
        >
          {isSavingAnswer
            ? t("course_quiz.actions.saving")
            : t("course_quiz.actions.continue")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
