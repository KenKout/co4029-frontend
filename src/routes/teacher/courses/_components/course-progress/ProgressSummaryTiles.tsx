import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, TrendingUp, Users } from "lucide-react";

import { formatHours } from "./helpers";
import { SummaryTile } from "./SummaryTile";
import type { CourseProgressController } from "./use-course-progress-controller";

/**
 * The four Progress summary tiles — enrolled, completed, average completion and
 * total time. Extracted verbatim from the former 401-line course-progress.tsx.
 */
export function ProgressSummaryTiles({
  controller,
}: {
  controller: CourseProgressController;
}) {
  const { t } = useTranslation();
  const { summary, cohortLoading } = controller;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <SummaryTile
        icon={Users}
        label={t("teacher_progress.tiles.enrolled")}
        value={summary.total}
        loading={cohortLoading}
      />
      <SummaryTile
        icon={CheckCircle2}
        label={t("teacher_progress.tiles.completed")}
        value={summary.completed}
        loading={cohortLoading}
        tone="emerald"
      />
      <SummaryTile
        icon={TrendingUp}
        label={t("teacher_progress.tiles.avg_completion")}
        value={`${summary.avgCompletion.toFixed(0)}%`}
        loading={cohortLoading}
      />
      <SummaryTile
        icon={Clock}
        label={t("teacher_progress.tiles.total_time")}
        value={formatHours(summary.totalHours)}
        loading={cohortLoading}
      />
    </div>
  );
}
