import { useTranslation } from "react-i18next";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

export type QuestionState = "completed" | "active" | "flagged" | "pending";

export interface QuizSummaryItem {
  id: string;
  /** Zero-based position in the ordered question list. */
  index: number;
  state: QuestionState;
  /** Per-question cooldown active (shows the amber dot). */
  onCooldown: boolean;
}

/**
 * Quiz summary card for the student quiz-taking screen.
 *
 * Merges the former "answered / flagged" stat block with the bottom
 * question-number grid into one component. Instead of a flat wrap of
 * number chips (which overflows for quizzes with hundreds of questions),
 * it renders an inner-scrollable list of every question — each row keeps
 * the same status colour coding as the old number chips (completed =
 * primary, active = ringed, flagged = amber, pending = muted) so the
 * visual language is unchanged. Clicking a row jumps to that question.
 */
export function QuizSummaryCard({
  items,
  answeredCount,
  flaggedCount,
  total,
  passingScore,
  onJump,
}: {
  items: QuizSummaryItem[];
  answeredCount: number;
  flaggedCount: number;
  total: number;
  passingScore: number;
  onJump: (index: number) => void;
}) {
  const { t } = useTranslation();

  return (
    <GlassCard className="p-6">
      <h4 className="font-headline font-bold text-m3-primary text-sm mb-4">
        {t("course_quiz.summary.title")}
      </h4>

      {/* Stat row: answered / flagged / passing score. */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl bg-surface-elev p-3 shadow-sm">
          <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
            {t("course_quiz.labels.answered")}
          </span>
          <span className="text-lg font-black font-headline text-m3-primary">
            {answeredCount}
            <span className="text-xs text-m3-outline-variant font-medium">
              /{total}
            </span>
          </span>
        </div>
        <div className="rounded-xl bg-surface-elev p-3 shadow-sm">
          <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
            {t("course_quiz.labels.flagged")}
          </span>
          <span className="text-lg font-black font-headline text-amber-500">
            {flaggedCount}
          </span>
        </div>
        <div className="rounded-xl bg-surface-elev p-3 shadow-sm">
          <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
            {t("course_quiz.labels.passing_score")}
          </span>
          <span className="text-lg font-black font-headline text-m3-secondary">
            {passingScore}%
          </span>
        </div>
      </div>

      {/* Question grid — number cells only. Inner scrollable so quizzes
          with hundreds of questions don't blow out the page height.
          Colours mirror the old bottom chips. */}
      <span className="block text-[10px] text-m3-outline uppercase font-bold mb-2 tracking-wider">
        {t("course_quiz.sections.question_overview")}
      </span>
      <div className="max-h-[22rem] overflow-y-auto overflow-x-hidden">
        <div className="grid grid-cols-6 gap-2 p-1.5">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onJump(item.index)}
              aria-current={item.state === "active"}
              className={cn(
                "aspect-square w-full flex items-center justify-center rounded-xl font-bold text-sm transition-all duration-150 hover:scale-110 relative cursor-pointer",
                item.state === "completed" &&
                  "bg-m3-primary text-white shadow-md",
                item.state === "active" &&
                  "bg-surface-elev text-m3-primary ring-2 ring-m3-primary shadow-md",
                item.state === "flagged" &&
                  "bg-amber-100 text-amber-700 ring-2 ring-amber-400",
                item.state === "pending" &&
                  "bg-m3-surface-container-high text-m3-outline hover:bg-m3-surface-container-highest",
              )}
            >
              {item.index + 1}
              {item.onCooldown && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-m3-surface" />
              )}
              {item.state === "flagged" && !item.onCooldown && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-m3-surface" />
              )}
            </button>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
