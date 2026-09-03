import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
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
      <Link
        to="/courses"
        search={{ scope: "enrolled" }}
        aria-label={t("dashboard.stats.enrolled_link")}
        className="block transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/60 rounded-xl"
      >
        <StatCard
          label={t("dashboard.stats.enrolled")}
          value={coursesLoading ? "—" : enrolledCount}
          sublabel={t("dashboard.stats.enrolled_sub")}
          icon={BookOpen}
          variant="primary"
        />
      </Link>
      <Link
        to="/notifications"
        aria-label={t("dashboard.stats.notifications_link")}
        className="block transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/60 rounded-xl"
      >
        <StatCard
          label={t("dashboard.stats.notifications")}
          value={notificationsLoading ? "—" : unreadCount}
          sublabel={t("dashboard.stats.notifications_sub")}
          icon={Bell}
          variant="surface"
        />
      </Link>
      <RetentionStatCard srLoading={srLoading} sr={sr} />
      <NextUnlockStatCard srLoading={srLoading} sr={sr} />
    </section>
  );
}
