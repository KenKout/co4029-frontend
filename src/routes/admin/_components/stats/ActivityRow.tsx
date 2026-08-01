import { ClipboardCheck, FileText, MessagesSquare, Users } from "lucide-react";

import { MiniStat } from "./MiniStat";
import { RowHeading } from "./RowHeading";
import type { AdminStatsController } from "./types";

/** Row 3: platform activity. */
export function ActivityRow({ c }: { c: AdminStatsController }) {
  const { t, f, data } = c;
  const { students } = c.passRate;

  return (
    <section className="space-y-3">
      <RowHeading>{t("admin.dashboard.rows.activity")}</RowHeading>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MiniStat
          label={t("admin.dashboard.activity.active_users")}
          value={t("admin.dashboard.activity.active_users_value", {
            wau: f.count(data?.active_users_7d),
            total: f.count(data?.total_users),
          })}
          detail={t("admin.dashboard.activity.active_users_detail", {
            today: f.count(data?.active_users_today),
          })}
          icon={Users}
          to="/admin/stats/active"
        />
        <MiniStat
          label={t("admin.dashboard.activity.quiz_sessions")}
          value={f.count(data?.quiz_sessions_completed_7d)}
          detail={t("admin.dashboard.tiles.window_7d")}
          icon={ClipboardCheck}
        />
        <MiniStat
          label={t("admin.dashboard.activity.interview_sessions")}
          value={f.count(data?.interview_sessions_7d)}
          detail={t("admin.dashboard.activity.sessions_by_students", {
            students: f.count(students),
          })}
          icon={MessagesSquare}
        />
        <MiniStat
          label={t("admin.dashboard.activity.materials_ingested")}
          value={f.count(data?.materials_ingested_7d)}
          detail={t("admin.dashboard.tiles.window_7d")}
          icon={FileText}
          to="/admin/stats/content"
        />
      </div>
    </section>
  );
}
