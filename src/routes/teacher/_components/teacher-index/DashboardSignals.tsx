import { FileStack, TrendingDown } from "lucide-react";

import { StatCard } from "@/components/ui/stat-card";
import type { TeacherDashboardStats } from "@/lib/api/hooks/teacher-courses";

import { formatCount } from "./helpers";
import type { TranslateFn } from "./types";

/**
 * Headline signals — the footer KPI row.
 *
 * Deliberately kept to facts that do NOT repeat the sections above: the
 * priority feed, the at-risk list and the review queue already state what
 * needs acting on, so restating those counts here would double the page
 * without adding information. What remains is signal the sections do not
 * carry:
 *
 *   - students with declining retention (spaced-repetition easiness below
 *     the 2.0 struggling threshold — nowhere else on the page),
 *   - draft courses (invisible to students until published — no section
 *     above covers them).
 */
export function DashboardSignals({
  stats,
  t,
}: {
  stats: TeacherDashboardStats | undefined;
  t: TranslateFn;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <StatCard
        label={t("teacher_dashboard.signals.declining_retention")}
        value={formatCount(stats?.students_below_ef_threshold)}
        sublabel={t("teacher_dashboard.signals.declining_retention_sub")}
        icon={TrendingDown}
        variant={
          (stats?.students_below_ef_threshold ?? 0) > 0 ? "glow" : "default"
        }
      />
      <StatCard
        label={t("teacher_dashboard.signals.draft_courses")}
        value={formatCount(stats?.draft_courses)}
        sublabel={t("teacher_dashboard.signals.draft_courses_sub")}
        icon={FileStack}
      />
    </div>
  );
}