import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasAnswer } from "@/lib/quiz/quiz-session-helpers";
import { QuizSubmitButton } from "@/routes/_components/QuizSubmitButton";
import type { QuizSession } from "./types";
import type { TakingView } from "./helpers";

/** Page navigation (multi-question layouts only). */
export function QuizPageNav({ session }: { session: QuizSession }) {
  const { t } = useTranslation();
  const { pageCount, safePageIndex, goToPage, submitAnswer, submitAttempt } =
    session;

  if (pageCount <= 1) return null;

  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <Button
        variant="ghost"
        onClick={() => goToPage(safePageIndex - 1)}
        disabled={
          safePageIndex === 0 ||
          submitAnswer.isPending ||
          submitAttempt.isPending
        }
        className="font-bold text-m3-primary hover:bg-m3-primary-fixed/30 rounded-xl gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("course_quiz.pagination.prev_page")}
      </Button>
      <span className="text-xs font-bold text-m3-on-surface-variant tabular-nums">
        {t("course_quiz.pagination.page_of", {
          page: safePageIndex + 1,
          pages: pageCount,
        })}
      </span>
      <Button
        variant="ghost"
        onClick={() => goToPage(safePageIndex + 1)}
        disabled={
          safePageIndex >= pageCount - 1 ||
          submitAnswer.isPending ||
          submitAttempt.isPending
        }
        className="font-bold text-m3-primary hover:bg-m3-primary-fixed/30 rounded-xl gap-2"
      >
        {t("course_quiz.pagination.next_page")}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

/** Previous-question button + the save / continue / final-submit controls. */
export function QuizTakingActions({
  session,
  view,
}: {
  session: QuizSession;
  view: TakingView;
}) {
  const { t } = useTranslation();
  const {
    activeIdx,
    setActiveIdx,
    submitAnswer,
    submitAttempt,
    handleSaveOnly,
    handleSaveNext,
    handleFinalSubmit,
  } = session;

  return (
    <div className="flex items-center justify-between mt-6 flex-wrap gap-3">
      <Button
        variant="ghost"
        onClick={() => setActiveIdx((current) => Math.max(0, current - 1))}
        disabled={
          activeIdx === 0 || submitAnswer.isPending || submitAttempt.isPending
        }
        className="font-bold text-m3-primary hover:bg-m3-primary-fixed/30 rounded-xl gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("course_quiz.actions.previous")}
      </Button>

      <div className="flex items-center gap-3 flex-wrap justify-end">
        <QuizSubmitButton
          isLastQuestion={view.isLastQuestion}
          hasSelection={hasAnswer(view.activeStatus)}
          isSaved={view.activeStatus.savedToServer}
          isSavingAnswer={submitAnswer.isPending}
          isFinalSubmitting={submitAttempt.isPending}
          cooldownRetryAt={view.activeQuestionCooldown}
          onSave={() => void handleSaveOnly()}
          onSaveNext={() => void handleSaveNext()}
          onFinalSubmit={() => void handleFinalSubmit("manual")}
        />
      </div>
    </div>
  );
}
