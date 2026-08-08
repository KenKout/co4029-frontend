import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { QUIZ_PAGE_SIZES } from "@/lib/quiz-timing";
import { Button } from "@/components/ui/button";
import type { QuizSession } from "./types";

/**
 * Per-page selector. 1 keeps the classic one-question-per-screen
 * flow; 5/10/All render several cards at once.
 */
export function QuizPerPageSelector({ session }: { session: QuizSession }) {
  const { t } = useTranslation();
  const {
    pageSize,
    changePageSize,
    pageCount,
    pageStart,
    pageEnd,
    displayQuestions,
  } = session;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("course_quiz.pagination.per_page_label")}
        </span>
        <div
          role="group"
          aria-label={t("course_quiz.pagination.per_page_label")}
          className="flex items-center rounded-lg border border-m3-outline-variant/40 bg-m3-surface-container p-0.5"
        >
          {QUIZ_PAGE_SIZES.map((size) => (
            <Button variant="ghost"
              key={String(size)}
              type="button"
              onClick={() => changePageSize(size)}
              aria-pressed={pageSize === size}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-bold transition-colors h-auto whitespace-normal",
                pageSize === size
                  ? "bg-m3-primary text-white"
                  : "text-m3-on-surface-variant hover:text-m3-primary",
              )}
            >
              {size === "all" ? t("course_quiz.pagination.per_page_all") : size}
            </Button>
          ))}
        </div>
      </div>
      {pageCount > 1 && (
        <span className="text-xs font-semibold text-m3-on-surface-variant tabular-nums">
          {t("course_quiz.pagination.showing", {
            from: pageStart + 1,
            to: pageEnd,
            total: displayQuestions.length,
          })}
        </span>
      )}
    </div>
  );
}
