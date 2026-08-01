import { useTranslation } from "react-i18next";
import type { ReviewQueueStats } from "./helpers";

/**
 * The session rail: progress bar, today's cap line, and the running
 * correct / remaining tiles. Uses the right-hand column of the wide layout.
 */
export function ReviewSessionRail({
  stats,
  index,
  total,
  answeredCount,
  correctCount,
}: {
  stats: ReviewQueueStats;
  index: number;
  total: number;
  answeredCount: number;
  correctCount: number;
}) {
  const { t } = useTranslation();
  const { dailyCap, reviewedToday } = stats;
  const pct = Math.round((index / total) * 100);

  return (
    <aside className="lg:sticky lg:top-6 space-y-4">
      <div className="bg-m3-surface-container-lowest rounded-2xl ghost-border shadow-editorial p-5 space-y-4">
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-m3-on-surface-variant">
              {t("study_review.session_progress", "Progress")}
            </span>
            <span className="text-xs font-semibold text-m3-on-surface tabular-nums">
              {index}/{total}
            </span>
          </div>
          <div className="h-2 rounded-full bg-m3-surface-container-high overflow-hidden">
            <div
              className="h-full bg-m3-primary transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {dailyCap > 0 && (
          <div className="text-[11px] text-m3-on-surface-variant">
            {t("study_review.today_progress", {
              done: reviewedToday + answeredCount,
              cap: dailyCap,
              defaultValue: "{{done}} of {{cap}} reviews today",
            })}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-emerald-50 p-3 text-center">
            <div className="text-xl font-headline font-black text-emerald-700 tabular-nums">
              {correctCount}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700/70">
              {t("study_review.stat_correct", "Correct")}
            </div>
          </div>
          <div className="rounded-xl bg-m3-surface-container-high p-3 text-center">
            <div className="text-xl font-headline font-black text-m3-on-surface tabular-nums">
              {total - index}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-m3-on-surface-variant">
              {t("study_review.stat_remaining", "Left")}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
