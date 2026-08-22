import { useTranslation } from "react-i18next";
import { Bell, BookOpen } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { NextUnlockStatCard, RetentionStatCard } from "./SrStatCards";
import type { SrSummaryView } from "./types";

interface DashboardStatsSectionProps extends SrSummaryView {
  coursesLoading: boolean;
  enrolledCount: number;
  notificationsLoading: boolean;
  unreadCount: number;
}

export default function DashboardStatsSection({
  stats,
}: {
  stats: DashboardStatsSectionProps;
}) {
  const { t } = useTranslation();
  const {
    coursesLoading,
    enrolledCount,
    notificationsLoading,
    unreadCount,
    srLoading,
    sr,
  } = stats;

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label={t("dashboard.stats.enrolled")}
        value={coursesLoading ? "—" : enrolledCount}
        sublabel={t("dashboard.stats.enrolled_sub")}
        icon={BookOpen}
        variant="primary"
      />
      <StatCard
        label={t("dashboard.stats.notifications")}
        value={notificationsLoading ? "—" : unreadCount}
        sublabel={t("dashboard.stats.notifications_sub")}
        icon={Bell}
        variant="surface"
      />
      <RetentionStatCard srLoading={srLoading} sr={sr} />
      <NextUnlockStatCard srLoading={srLoading} sr={sr} />
    </section>
  );
}
