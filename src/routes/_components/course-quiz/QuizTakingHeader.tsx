import { useTranslation } from "react-i18next";
import { GradientProgress } from "@/components/ui/gradient-progress";
import type { QuizStageProps } from "./types";

/**
 * Quiz title, the "current / total" counter, prior-attempt count and the
 * answered-progress bar. Markup moved verbatim from course-quiz.tsx.
 */
export function QuizTakingHeader({
  session,
  quiz,
  progressPct,
}: Pick<QuizStageProps, "session" | "quiz"> & { progressPct: number }) {
  const { t } = useTranslation();
  const { activeIdx, displayQuestions, attempts } = session;

  return (
    <div className="mb-8">
      <div className="flex justify-between items-end mb-3 gap-4 flex-wrap">
        <div>
          <h1 className="font-headline font-extrabold text-3xl sm:text-4xl text-m3-primary tracking-tight leading-none mb-1">
            {quiz.title}
          </h1>
          <p className="text-m3-on-surface-variant text-base">
            {t("course_quiz.sections.module_review")}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="block font-headline font-bold text-2xl text-m3-secondary">
            {String(activeIdx + 1).padStart(2, "0")}{" "}
            <span className="text-m3-outline-variant font-medium text-sm">
              / {displayQuestions.length}
            </span>
          </span>
          <span className="text-[10px] uppercase tracking-widest font-bold text-m3-outline">
            {t("course_quiz.labels.attempts_before", {
              count: attempts.length,
            })}
          </span>
        </div>
      </div>
      <GradientProgress value={progressPct} variant="secondary" size="sm" />
    </div>
  );
}
