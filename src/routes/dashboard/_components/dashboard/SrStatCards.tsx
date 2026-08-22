import { useTranslation } from "react-i18next";
import { Brain, Unlock } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import type { SrSummaryView } from "./types";

/**
 * Retention (R-hat) replaces the old hardcoded "Quizzes: —". Quizzes
 * are never "graded" in this system — answering updates EF and gives
 * instant per-question feedback — so the old tile described a system
 * that doesn't exist. Shows an em-dash when the student has no tracked
 * cards: 0% retention would read as catastrophic rather than "no data
 * yet".
 */
export function RetentionStatCard({ srLoading, sr }: SrSummaryView) {
  const { t } = useTranslation();
  return (
    <StatCard
      label={t("dashboard.stats.retention")}
      value={
        srLoading
          ? "—"
          : sr?.has_retention_data
            ? `${Math.round((sr.avg_kr_estimate ?? 0) * 100)}%`
            : "—"
      }
      sublabel={
        sr?.has_retention_data
          ? t("dashboard.stats.retention_sub", {
              mature: sr.lessons_mature,
              total: sr.lessons_total,
            })
          : t("dashboard.stats.retention_no_data")
      }
      icon={Brain}
      variant="surface"
    />
  );
}

/**
 * Progression readiness replaces "Interviews: Scheduled". Interviews
 * are available-on-demand once unlocked, never scheduled, so the old
 * subtext described a different product. This shows how close the
 * nearest locked lesson is to opening.
 */
export function NextUnlockStatCard({ srLoading, sr }: SrSummaryView) {
  const { t } = useTranslation();
  return (
    <StatCard
      label={t("dashboard.stats.next_unlock")}
      value={
        srLoading
          ? "—"
          : sr?.next_unlock_lesson_title
            ? `${Math.round(sr.next_unlock_progress_pct)}%`
            : t("dashboard.stats.all_unlocked")
      }
      sublabel={
        sr?.next_unlock_lesson_title
          ? t("dashboard.stats.next_unlock_sub", {
              lesson: sr.next_unlock_lesson_title,
            })
          : t("dashboard.stats.next_unlock_none")
      }
      icon={Unlock}
      variant="surface"
    />
  );
}
