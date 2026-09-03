import { useTranslation } from "react-i18next";
import { GlassCard } from "@/components/ui/glass-card";
import type {
  QuizAttemptReviewQuestion,
  QuizAttemptReviewRead,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { computeReviewStats } from "./helpers";

type ReviewChipState = "correct" | "incorrect" | "answered" | "skipped";

function chipStateFor(
  q: QuizAttemptReviewQuestion,
  showCorrectness: boolean,
): ReviewChipState {
  if (!showCorrectness && (q.selected_option_id || q.answer_text))
    return "answered";
  if (q.is_correct) return "correct";
  if (q.selected_option_id || q.answer_text) return "incorrect";
  return "skipped";
}

/**
 * Question navigation for the attempt-review screen — same design language as
 * the taking screen's QuizSummaryCard (scrollable number-chip grid, status
 * colour coding, click to jump), with review semantics: green = correct,
 * red = incorrect (answered but wrong), muted = skipped/unanswered.
 */
export function QuizReviewNavigator({
  questions,
  onJump,
  visibility,
}: {
  questions: QuizAttemptReviewQuestion[];
  onJump: (index: number) => void;
  visibility: QuizAttemptReviewRead["visibility"];
}) {
  const { t } = useTranslation();
  const stats = computeReviewStats(questions);

  return (
    <GlassCard className="p-6">
      <h4 className="font-headline font-bold text-m3-primary text-sm mb-4">
        {t("course_quiz_review.nav_title")}
      </h4>

      {/* Stat row: correct / incorrect / skipped. */}
      {visibility.show_correctness && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl bg-surface-elev p-3 shadow-sm">
            <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
              {t("course_quiz_review.stats.correct")}
            </span>
            <span className="text-lg font-black font-headline text-emerald-600">
              {stats.correct}
            </span>
          </div>
          <div className="rounded-xl bg-surface-elev p-3 shadow-sm">
            <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
              {t("course_quiz_review.stats.incorrect")}
            </span>
            <span className="text-lg font-black font-headline text-red-600">
              {stats.incorrect}
            </span>
          </div>
          <div className="rounded-xl bg-surface-elev p-3 shadow-sm">
            <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
              {t("course_quiz_review.stats.skipped")}
            </span>
            <span className="text-lg font-black font-headline text-m3-outline">
              {stats.skipped}
            </span>
          </div>
        </div>
      )}

      {/* Question grid — number cells only, same layout as the taking screen. */}
      <span className="block text-[10px] text-m3-outline uppercase font-bold mb-2 tracking-wider">
        {t("course_quiz_review.questions_title")}
      </span>
      <div className="max-h-[22rem] overflow-y-auto overflow-x-hidden">
        <div className="grid grid-cols-6 gap-2 p-1.5">
          {questions.map((q, idx) => {
            const state = chipStateFor(q, visibility.show_correctness);
            return (
              <Button
                variant="ghost"
                key={q.question_id}
                type="button"
                onClick={() => onJump(idx)}
                aria-label={`${t("course_quiz_review.nav_title")} ${idx + 1}`}
                className={cn(
                  "aspect-square w-full flex items-center justify-center rounded-xl font-bold text-sm transition-all duration-150 hover:scale-110 relative cursor-pointer h-auto p-0 whitespace-normal",
                  state === "correct" && "bg-emerald-500 text-white shadow-md",
                  state === "incorrect" && "bg-red-500 text-white shadow-md",
                  state === "answered" && "bg-m3-primary text-white shadow-md",
                  state === "skipped" &&
                    "bg-m3-surface-container-high text-m3-outline hover:bg-m3-surface-container-highest",
                )}
              >
                {idx + 1}
              </Button>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}
