import { KeyRound, ShieldAlert, UserCog, Users } from "lucide-react";

import { ActionTile } from "@/components/ui/action-tile";
import { SectionErrorBox } from "@/components/ui/section-error-box";
import { Skeleton } from "@/components/ui/skeleton";

import { RowHeading } from "./RowHeading";
import type { AdminStatsController } from "./types";

/** Section shell, so the loading and error states cannot drift from the row. */
function SecuritySection({
  c,
  children,
}: {
  c: AdminStatsController;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3" aria-labelledby="admin-security">
      <RowHeading id="admin-security">
        {c.t("admin.dashboard.rows.security")}
      </RowHeading>
      {children}
    </section>
  );
}

/** Failed-login caption: source count when there were failures, else "none". */
function failedLoginDetail(c: AdminStatsController, window: string): string {
  const sources = c.security.data?.distinct_failed_ips;
  // The source count is what separates one stale password from a spray.
  // Omitted rather than shown as 0 when nothing failed.
  return sources != null
    ? c.t("admin.dashboard.tiles.failed_logins_detail", {
        sources: c.f.count(sources),
        window,
      })
    : c.t("admin.dashboard.tiles.failed_logins_none", { window });
}

/** Any occurrence is worth a look; zero is not. Stated as a display choice —
 *  real thresholds arrive with the alert rules (D-03). */
function presenceSeverity(count: number | undefined): "ok" | "warn" {
  return (count ?? 0) > 0 ? "warn" : "ok";
}

/**
 * Row: Security & Access (PRD ADM-020).
 *
 * Every tile links to the rows behind it, already filtered — failed logins
 * open the request log scoped to the auth surface, role changes open the
 * role-change tab (ADM-021). An operator should never have to reconstruct the
 * query that produced the number they just clicked.
 *
 * There is no severity or review state here. Alert rules and their thresholds
 * are an open decision (D-03), and the one band this row does apply — "any
 * denied request is worth a look" — is a display choice stated as such, not a
 * risk score the backend computed.
 */
export function SecurityAccessRow({ c }: { c: AdminStatsController }) {
  const { t, f, security, scope } = c;
  const window = t("admin.dashboard.window.label", { days: scope.windowDays });

  if (security.isError) {
    return (
      <SecuritySection c={c}>
        <SectionErrorBox messageKey="admin.dashboard.security.load_failed" />
      </SecuritySection>
    );
  }

  if (security.isLoading) {
    return (
      <SecuritySection c={c}>
        <Skeleton className="h-28 rounded-xl" />
      </SecuritySection>
    );
  }

  const s = security.data;

  return (
    <SecuritySection c={c}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ActionTile
          label={t("admin.dashboard.tiles.failed_logins")}
          value={f.count(s?.failed_logins)}
          detail={failedLoginDetail(c, window)}
          severity={presenceSeverity(s?.failed_logins)}
          icon={KeyRound}
          to="/admin/audit-logs"
          search={{ tab: "http", path: "/api/v1/auth/" }}
        />

        <ActionTile
          label={t("admin.dashboard.tiles.denied_requests")}
          value={f.count(s?.denied_requests)}
          detail={t("admin.dashboard.tiles.denied_requests_detail", { window })}
          severity={presenceSeverity(s?.denied_requests)}
          icon={ShieldAlert}
          to="/admin/audit-logs"
          search={{ tab: "http" }}
        />

        <ActionTile
          label={t("admin.dashboard.tiles.role_changes")}
          value={f.count(s?.role_changes)}
          detail={t("admin.dashboard.tiles.role_changes_detail", {
            revoked: f.count(s?.role_revocations),
            window,
          })}
          icon={UserCog}
          to="/admin/audit-logs"
          search={{ tab: "role_changes" }}
        />

        <ActionTile
          label={t("admin.dashboard.tiles.privileged_accounts")}
          value={f.count(s?.privileged_accounts)}
          detail={t("admin.dashboard.tiles.privileged_accounts_detail", {
            sessions: f.count(s?.active_sessions),
          })}
          icon={Users}
          to="/admin/users"
        />
      </div>

      {/* Same honesty as the other rows: say which numbers the tenant filter
          could not reach rather than letting them imply it did. */}
      {scope.organizationId !== null && s?.request_scope === "global" && (
        <p className="text-xs text-text-muted">
          {t("admin.dashboard.scope.security")}
        </p>
      )}
    </SecuritySection>
  );
}
