import { useTranslation } from "react-i18next";
import type { CourseProgressSummary } from "@/lib/api/types";

/**
 * The per-course completion bar for a career path.
 *
 * All that survives of the path's own bespoke course row: the row itself is
 * now the catalogue's `CourseListRow`, so a course looks the same on
 * /catalog/career-paths/<slug> as it does on /courses. This piece stayed
 * because the catalogue has no notion of progress against a path and the bar
 * is the one thing the shared row cannot express — it rides in the row's
 * `meta` slot.
 *
 * Renders nothing without a progress row: a course the student never started
 * has no measurement, and a 0% bar would claim one.
 */
export function CourseProgressMeta({
  progress,
}: {
  progress?: CourseProgressSummary;
}) {
  const { t } = useTranslation();
  if (!progress) return null;
  const completion = progress.completion_percent ?? 0;

  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-wider text-m3-on-surface-variant uppercase">
          {t("career_path_detail.course_progress_label")}
        </span>
        <span className="text-[11px] font-semibold text-m3-on-surface">
          {Math.round(completion)}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-m3-surface-container">
        <div
          className="h-full bg-m3-primary transition-all"
          style={{ width: `${Math.min(100, Math.max(0, completion))}%` }}
        />
      </div>
    </div>
  );
}
