import { Building2, MoonStar } from "lucide-react";

import { ActionTile } from "@/components/ui/action-tile";
import { SectionErrorBox } from "@/components/ui/section-error-box";

import { RowHeading } from "./RowHeading";
import type { AdminStatsController } from "./types";

/**
 * Row 5: Tenant Anomalies.
 *
 * Only inactivity is here. The other three anomalies the PRD names — per-tenant
 * cost spikes, usage drops and failed jobs by organization — need an
 * organization edge on `ai_model_calls` and `processing_jobs` that the schema
 * does not have, so they are not stubbed with placeholder zeros. The row says
 * what it can prove and no more; the rest arrives with that migration.
 */
export function TenantAnomaliesRow({ c }: { c: AdminStatsController }) {
  const { t, f, tenant } = c;

  if (c.isError) {
    return (
      <section className="space-y-3" aria-labelledby="admin-tenants">
        <RowHeading id="admin-tenants">
          {t("admin.dashboard.rows.tenants")}
        </RowHeading>
        <SectionErrorBox messageKey="admin.stats.load_failed" />
      </section>
    );
  }

  return (
    <section className="space-y-3" aria-labelledby="admin-tenants">
      <RowHeading id="admin-tenants">
        {t("admin.dashboard.rows.tenants")}
      </RowHeading>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ActionTile
          label={t("admin.dashboard.tiles.orgs_inactive")}
          value={f.count(tenant.orgsInactive)}
          detail={t("admin.dashboard.tiles.orgs_inactive_detail", {
            total: f.count(tenant.orgsTotal),
          })}
          severity={tenant.severity}
          icon={MoonStar}
          to="/admin/organizations"
        />
        <ActionTile
          label={t("admin.dashboard.tiles.orgs_total")}
          value={f.count(tenant.orgsTotal)}
          detail={t("admin.dashboard.tiles.orgs_total_detail")}
          icon={Building2}
          to="/admin/organizations"
        />
      </div>
    </section>
  );
}
