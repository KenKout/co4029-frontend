import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, TrendingUp, Users } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

import { formatHours } from "./helpers";
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
      <StatCard
        icon={Users}
        label={t("teacher_progress.tiles.enrolled")}
        value={cohortLoading ? "—" : summary.total}
        className="p-4"
      />
      <StatCard
        icon={CheckCircle2}
        label={t("teacher_progress.tiles.completed")}
        value={cohortLoading ? "—" : summary.completed}
        className="p-4"
      />
      <StatCard
        icon={TrendingUp}
        label={t("teacher_progress.tiles.avg_completion")}
        value={cohortLoading ? "—" : `${summary.avgCompletion.toFixed(0)}%`}
        className="p-4"
      />
      <StatCard
        icon={Clock}
        label={t("teacher_progress.tiles.total_time")}
        value={cohortLoading ? "—" : formatHours(summary.totalHours)}
        className="p-4"
      />
    </div>
  );
}
