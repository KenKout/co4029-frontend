import { useTranslation } from "react-i18next";
import { ArrowLeft, Flag, LayoutList, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasAnswer } from "@/lib/quiz/quiz-session-helpers";
import { QuizSubmitButton } from "@/routes/_components/QuizSubmitButton";
import { FooterIconButton } from "./QuizSummaryDialog";
import type { QuizSession } from "./types";
import type { TakingView } from "./helpers";

/**
 * Sticky footer of the taking screen: Flag / Question list / Hint icons on
 * the left, Prev + Next (Submit on the last question) on the right — the
 * actions moved down out of each question card so the cards stay compact.
 *
 * Acts on the ACTIVE question (the ring-highlighted one).
 */
export function QuizTakingFooter({
  session,
  view,
  onOpenSummary,
}: {
  session: QuizSession;
  view: TakingView;
  onOpenSummary: () => void;
}) {
  const { t } = useTranslation();
  const {
    activeIdx,
    setActiveIdx,
    displayQuestions,
    statuses,
    setStatuses,
    submitAnswer,
    submitAttempt,
    setHintDialogOpen,
    handleSaveNext,
    handleFinalSubmit,
  } = session;

  const status = statuses[activeIdx];
  const busy = submitAnswer.isPending || submitAttempt.isPending;

  const showHintButton = view.activeQuestion.hint_text != null;

  const handleNext = () => {
    if (view.isLastQuestion) {
      void handleFinalSubmit("manual");
      return;
    }
    // Skip / advance: persist a dirty answer first (auto-save may not have
    // fired yet), otherwise just move on.
    const st = statuses[activeIdx];
    if (st && hasAnswer(st) && !st.savedToServer) {
      void handleSaveNext();
    } else {
      setActiveIdx((current) =>
        Math.min(displayQuestions.length - 1, current + 1),
      );
    }
  };

  return (
    <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 lg:mx-0 lg:px-0 px-4 sm:px-6 py-2 mt-4 bg-white/95 backdrop-blur-md border-t border-border flex items-center gap-1.5 sm:gap-2">
      <FooterIconButton
        label={
          status?.flagged
            ? t("course_quiz.actions.unflag")
            : t("course_quiz.actions.flag")
        }
        active={status?.flagged}
        disabled={busy}
        onClick={() => {
          setStatuses((current) =>
            current.map((s, i) =>
              i === activeIdx ? { ...s, flagged: !s.flagged } : s,
            ),
          );
        }}
      >
        <Flag className="h-5 w-5" />
      </FooterIconButton>

      <FooterIconButton
        label={t("course_quiz.summary.open_aria")}
        disabled={busy}
        onClick={onOpenSummary}
      >
        <LayoutList className="h-5 w-5" />
      </FooterIconButton>

      {showHintButton && (
        <FooterIconButton
          label={
            status?.hintViewed
              ? t("course_quiz.actions.view_hint_again")
              : t("course_quiz.actions.show_hint")
          }
          disabled={busy}
          onClick={() => {
            setStatuses((current) =>
              current.map((s, i) =>
                i === activeIdx ? { ...s, hintViewed: true } : s,
              ),
            );
            setHintDialogOpen(true);
          }}
        >
          <Lightbulb className="h-5 w-5" />
        </FooterIconButton>
      )}

      <div className="flex-1" />

      <Button
        variant="ghost"
        onClick={() => setActiveIdx((current) => Math.max(0, current - 1))}
        disabled={activeIdx === 0 || busy}
        className="font-bold text-m3-primary hover:bg-m3-primary-fixed/30 rounded-xl gap-1.5 shrink-0"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("course_quiz.actions.previous")}
      </Button>

      <QuizSubmitButton
        isLastQuestion={view.isLastQuestion}
        hasSelection={hasAnswer(view.activeStatus)}
        isSavingAnswer={submitAnswer.isPending}
        isFinalSubmitting={submitAttempt.isPending}
        cooldownRetryAt={view.activeQuestionCooldown}
        onNext={handleNext}
        onFinalSubmit={() => void handleFinalSubmit("manual")}
      />
    </div>
  );
}

export default QuizTakingFooter;
