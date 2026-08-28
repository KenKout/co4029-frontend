import { Brain, ClipboardCheck, Clock, TrendingDown } from "lucide-react";

import { StatCard } from "@/components/ui/stat-card";
import type { TeacherDashboardStats } from "@/lib/api/hooks/teacher-courses";

import { formatCount } from "./helpers";
import type { TranslateFn } from "./types";

/**
 * Headline signals. Replaces the old Total/Published/Drafts/AI-Enabled
 * counts: those were static and answered no question a teacher would act
 * on. These four are the ones that change behaviour — what needs review,
 * who is falling behind, and how retention is trending.
 *
 * "Students needing attention" is backed by the progress feature's risk
 * engine (inactivity, no engagement, low completion, with a grace period
 * for new enrolments), NOT by spaced-repetition easiness. It previously
 * showed `students_below_ef_threshold`, which carried the same name as the
 * course page's at-risk rule while counting a different population — two
 * screens disagreeing about who is struggling.
 */
export function DashboardSignals({
  stats,
  cardsAwaitingReview,
  t,
}: {
  stats: TeacherDashboardStats | undefined;
  cardsAwaitingReview: number;
  t: TranslateFn;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatCard
        label={t("teacher_dashboard.signals.cards_awaiting_review")}
        value={formatCount(cardsAwaitingReview)}
        sublabel={t("teacher_dashboard.signals.cards_awaiting_review_sub")}
        icon={ClipboardCheck}
        variant={cardsAwaitingReview > 0 ? "glow" : "default"}
      />
      <StatCard
        label={t("teacher_dashboard.signals.students_needing_attention")}
        value={formatCount(stats?.students_needing_attention)}
        sublabel={t("teacher_dashboard.signals.students_needing_attention_sub")}
        icon={TrendingDown}
        variant={
          stats?.students_needing_attention ? "glow" : "default"
        }
      />
      <StatCard
        label={t("teacher_dashboard.signals.avg_retention")}
        value={
          stats?.avg_retention_ef ? stats.avg_retention_ef.toFixed(2) : "—"
        }
        sublabel={t("teacher_dashboard.signals.avg_retention_sub")}
        icon={Brain}
      />
      <StatCard
        label={t("teacher_dashboard.signals.cards_overdue")}
        value={formatCount(stats?.cards_overdue)}
        sublabel={t("teacher_dashboard.signals.cards_overdue_sub")}
        icon={Clock}
      />
    </div>
  );
}
