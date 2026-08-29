import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ChevronRight,
  Coins,
  Database,
  MoonStar,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageSkeleton } from "@/components/ui/page-skeleton";
import { SectionErrorBox } from "@/components/ui/section-error-box";
import { useTenantOperations } from "@/lib/api/hooks/admin-tenants";
import { useFormatDateTime } from "@/lib/format/date";
import { cn } from "@/lib/utils";

/**
 * Tenant operations (PRD ADM-042).
 *
 * Organization detail was an identity record — info, domains, units,
 * memberships — and an operator's questions about a tenant are operational:
 * how much of it is there, what is it costing, is its background work healthy,
 * has it gone quiet.
 *
 * The job figures here ARE organization-scoped, unlike the platform-wide ones
 * on the dashboard. For a single tenant the server can walk its entity set
 * directly; across every tenant it cannot, which is why the dashboard still
 * reports jobs as global. Worth knowing when the two disagree — they are
 * measuring different populations on purpose.
 */
export function OperationsTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation();
  const formatDateTime = useFormatDateTime();
  const { data, isLoading, isError } = useTenantOperations(orgId);

  if (isError) {
    return (
      <SectionErrorBox messageKey="admin.organizations.operations.load_failed" />
    );
  }
  if (isLoading || !data) {
    return <PageSkeleton rows={4} bg="bg-surface-muted" />;
  }

  const window = t("admin.dashboard.window.label", { days: data.window_days });

  return (
    <div className="space-y-6">
      {data.is_inactive && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50/60 p-4">
          <MoonStar
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
          />
          <p className="text-sm text-amber-800">
            {data.last_activity_at
              ? t("admin.organizations.operations.inactive_since", {
                  days: data.days_quiet ?? 0,
                  at: formatDateTime(data.last_activity_at),
                })
              : t("admin.organizations.operations.never_active")}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={Users}
          label={t("admin.organizations.operations.members")}
          value={String(data.active_members)}
          detail={t("admin.organizations.operations.members_detail", {
            active: data.members_active_in_window,
            window,
          })}
        />
        <Stat
          icon={Database}
          label={t("admin.organizations.operations.content")}
          value={String(data.course_count)}
          detail={t("admin.organizations.operations.content_detail", {
            published: data.published_course_count,
            materials: data.material_count,
          })}
        />
        <Stat
          icon={Database}
          label={t("admin.organizations.operations.storage")}
          value={formatBytes(data.storage_bytes)}
          detail={t("admin.organizations.operations.storage_detail")}
        />
        <Stat
          icon={Coins}
          label={t("admin.organizations.operations.spend")}
          value={`$${data.spend_window_usd.toFixed(4)}`}
          detail={
            // Never show a tenant's spend without the attribution caveat: the
            // figure is derived, and low coverage means it understates.
            data.spend_coverage_pct === null
              ? t("admin.organizations.operations.spend_no_data", { window })
              : t("admin.organizations.operations.spend_detail", {
                  window,
                  coverage: data.spend_coverage_pct.toFixed(0),
                })
          }
        />
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <h3 className="flex items-center gap-2 text-sm font-headline font-bold text-text-strong">
          <AlertTriangle aria-hidden="true" className="h-4 w-4" />
          {t("admin.organizations.operations.jobs")}
        </h3>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <JobStat
            label={t("admin.organizations.operations.job_failure_rate")}
            value={
              // Same nullable-rate contract as everywhere else in the console.
              data.job_failure_rate_pct === null
                ? t("admin.dashboard.no_data")
                : `${data.job_failure_rate_pct.toFixed(1)}%`
            }
            tone={
              (data.job_failure_rate_pct ?? 0) > 10 ? "critical" : "neutral"
            }
            detail={t("admin.organizations.operations.job_rate_detail", {
              failed: data.jobs_failed_window,
              total: data.jobs_terminal_window,
              window,
            })}
          />
          <JobStat
            label={t("admin.organizations.operations.jobs_in_flight")}
            value={String(data.jobs_in_flight)}
            detail={t("admin.organizations.operations.jobs_in_flight_detail")}
          />
          <JobStat
            label={t("admin.organizations.operations.config_overrides")}
            value={String(data.config_overrides)}
            detail={t("admin.organizations.operations.config_detail")}
          />
        </dl>
        <Link
          to="/admin/settings"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-m3-primary hover:underline"
        >
          {t("admin.organizations.operations.open_config")}
          <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-m3-on-surface-variant">
        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 text-2xl font-heading font-semibold tabular-nums text-text-strong">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-text-muted">{detail}</p>
    </div>
  );
}

function JobStat({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "critical";
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-m3-on-surface-variant">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-lg font-heading font-semibold tabular-nums",
          tone === "critical" ? "text-red-700" : "text-text-strong",
        )}
      >
        {value}
      </dd>
      <p className="text-xs text-text-muted">{detail}</p>
    </div>
  );
}

/** Binary units, because storage quotas are quoted that way. */
function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
