import { useTranslation } from "react-i18next";

import type { QuizQuestionAuthoring } from "@/lib/api/types";
import { QuestionNavigatorCell } from "./QuestionNavigatorCell";
import { QuestionNavigatorLegend } from "./QuestionNavigatorLegend";
import { hasInvalidExpectedTime } from "./helpers";
import { deriveNavCellStatus } from "./question-nav-status";
import { useQuestionNavSpy } from "./use-question-nav-spy";

/**
 * Sticky question navigator. Renders six orthogonal status layers (error,
 * approved, pending, unsaved, selected, focused) on separate visual channels,
 * with the colour legend in a hover popover on the title.
 *
 * Extracted from the former 3.5k-line quiz-manage.tsx; behaviour unchanged.
 * Scroll-spy lives in useQuestionNavSpy, per-cell status in
 * question-nav-status, and each cell in QuestionNavigatorCell.
 */
export function QuestionNavigator({
  questions,
  selectedIds,
  dirtyIds,
  onJump,
}: {
  questions: QuizQuestionAuthoring[];
  /** Bulk-action selection, rendered as a corner tick badge. */
  selectedIds?: Set<string>;
  /** Questions with unsaved local edits, rendered as an amber ring + pencil. */
  dirtyIds?: Set<string>;
  /** Notified when a cell is clicked (so the parent can also select/focus). */
  onJump?: (questionId: string) => void;
}) {
  const { t } = useTranslation();
  const { activeId, scrollToQuestion } = useQuestionNavSpy(questions, onJump);

  if (questions.length === 0) return null;

  // Mirrors the per-cell rule: an unsaved pre-filled default isn't an error.
  const errorCount = questions.filter(
    (q) => hasInvalidExpectedTime(q) && !(dirtyIds?.has(q.id) ?? false),
  ).length;
  const unsavedCount = dirtyIds
    ? questions.filter((q) => dirtyIds.has(q.id)).length
    : 0;

  return (
    <div className="rounded-xl border border-m3-secondary/10 bg-m3-surface-container-low p-5 shadow-glass space-y-3">
      <div className="flex items-center justify-between gap-2">
        <QuestionNavigatorLegend />
        {/* Roll-up counts for the two states that need action. */}
        <div className="flex items-center gap-1.5">
          {errorCount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
              {t("teacher_quiz_manage.question_nav.error_count", {
                count: errorCount,
              })}
            </span>
          )}
          {unsavedCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              {t("teacher_quiz_manage.question_nav.unsaved_count", {
                count: unsavedCount,
              })}
            </span>
          )}
        </div>
      </div>
      {/* Numbered grid — reuses the student QuizSummaryCard box design.
          Inner-scrollable so a quiz with many questions doesn't blow out
          the sticky sidebar height. */}
      <div className="max-h-[22rem] overflow-y-auto overflow-x-hidden">
        <div className="grid grid-cols-6 gap-1.5 p-1.5">
          {questions.map((question, index) => (
            <QuestionNavigatorCell
              key={question.id}
              question={question}
              index={index}
              status={deriveNavCellStatus({
                question,
                activeId,
                dirtyIds,
                selectedIds,
              })}
              onSelect={() => scrollToQuestion(question.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
