import { RowHeading } from "./RowHeading";
import type { AdminStatsController } from "./types";
import { ActiveUsersStatsContent } from "../../stats-active";
import { ContentStatsContent } from "../../stats-content";

/** Active-user demand and content inventory in the dashboard's shared scope. */
export function UsageCapacitySection({ c }: { c: AdminStatsController }) {
  return (
    <section
      className="space-y-6 scroll-mt-32"
      aria-labelledby="admin-usage-capacity"
    >
      <div>
        <RowHeading id="admin-usage-capacity">
          {c.t("admin.dashboard.rows.usage_capacity")}
        </RowHeading>
        <p className="mt-1 text-sm text-text-muted">
          {c.t("admin.dashboard.usage_capacity_subtitle")}
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text-strong">
          {c.t("admin.stats.title_active_users")}
        </h3>
        <ActiveUsersStatsContent range={c.scope.range} />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text-strong">
          {c.t("admin.stats.title_content")}
        </h3>
        <ContentStatsContent />
      </div>
    </section>
  );
}
