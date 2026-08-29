import { CheckCircle2, CircleDashed, HelpCircle, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { SectionErrorBox } from "@/components/ui/section-error-box";
import {
  useDeepHealth,
  useReadyz,
  type DeepHealthCheck,
} from "@/lib/api/hooks/infra";
import { cn } from "@/lib/utils";

/**
 * Services tab — per-dependency readiness.
 *
 * The old `/admin/health` page rendered `/healthz` and `/readyz` as two opaque
 * cards, so a degraded platform said "degraded" without naming what was
 * degraded. `/healthz/deep` reports each dependency with its probe latency,
 * which is the difference between "something is wrong" and "Redis is wrong".
 *
 * `/readyz` is still shown alongside, because it is the only source for
 * `alembic_at_head` — a schema behind the code is an outage waiting to happen
 * and no dependency probe catches it.
 */

type ServiceRow = {
  key: string;
  label: string;
  status: DeepHealthCheck["status"] | "unknown";
  latencyMs: number | null;
};

const STATE_STYLE: Record<
  ServiceRow["status"],
  { icon: LucideIcon; className: string }
> = {
  ok: { icon: CheckCircle2, className: "text-emerald-700" },
  unhealthy: { icon: XCircle, className: "text-red-700" },
  disabled: { icon: CircleDashed, className: "text-text-muted" },
  skipped: { icon: CircleDashed, className: "text-text-muted" },
  unknown: { icon: HelpCircle, className: "text-text-muted" },
};

/** Dependencies in reading order; anything unrecognised is appended. */
const SERVICE_ORDER = [
  "postgres",
  "redis",
  "neo4j",
  "garage_s3",
  "llm_provider",
];

export function ServicesTab() {
  const { t } = useTranslation();
  const deep = useDeepHealth();

  const checks = deep.data?.checks ?? {};
  const keys = [
    ...SERVICE_ORDER.filter((k) => k in checks),
    ...Object.keys(checks).filter((k) => !SERVICE_ORDER.includes(k)),
  ];
  const rows: ServiceRow[] = keys.map((key) => ({
    key,
    label: t(`admin.dashboard.services.${key}`, { defaultValue: key }),
    status: checks[key]?.status ?? "unknown",
    latencyMs: checks[key]?.latency_ms ?? null,
  }));

  const columns: DataTableColumn<ServiceRow>[] = [
    {
      id: "dependency",
      header: t("admin.operations.services.columns.dependency"),
      cell: (row) => (
        <span className="font-medium text-text-strong">{row.label}</span>
      ),
    },
    {
      id: "status",
      header: t("admin.operations.services.columns.status"),
      cell: (row) => {
        const style = STATE_STYLE[row.status];
        const Icon = style.icon;
        return (
          <span className={cn("flex items-center gap-2", style.className)}>
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="font-medium">
              {t(`admin.operations.services.status.${row.status}`)}
            </span>
          </span>
        );
      },
    },
    {
      id: "latency",
      header: t("admin.operations.services.columns.latency"),
      align: "right",
      cell: (row) => (
        <span className="tabular-nums text-text-muted">
          {/* No latency is not zero latency: a disabled or unreachable probe
              never timed anything. */}
          {row.latencyMs === null
            ? t("admin.dashboard.no_data")
            : `${Math.round(row.latencyMs)}ms`}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-strong">
            {t("admin.operations.services.title")}
          </h2>
          {deep.data?.version && (
            <p className="text-xs text-text-muted">
              {t("admin.dashboard.version", { version: deep.data.version })}
            </p>
          )}
        </div>

        {deep.isError ? (
          <SectionErrorBox messageKey="admin.health.cannot_connect" />
        ) : deep.isLoading ? (
          <PageSkeleton rows={4} bg="bg-surface-muted" />
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            getRowId={(row) => row.key}
          />
        )}
      </section>

      <ReadinessSection />
    </div>
  );
}

/**
 * Readiness probe. Kept separate from the dependency table because it answers
 * a different question — "should a load balancer send traffic here" — and
 * carries the migration check nothing else reports.
 */
function ReadinessSection() {
  const { t } = useTranslation();
  const readyz = useReadyz();

  const entries =
    readyz.data && typeof readyz.data === "object"
      ? Object.entries(readyz.data as Record<string, unknown>)
      : [];

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-text-strong">
        {t("admin.health.readyz_card")}
      </h2>
      {readyz.isError ? (
        <SectionErrorBox messageKey="admin.health.cannot_connect" />
      ) : (
        <dl className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface-elev p-5 sm:grid-cols-2">
          {entries.map(([key, value]) => {
            const ok = value === "ok" || value === true;
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-3"
              >
                <dt className="text-xs text-text-muted">{key}</dt>
                <dd
                  className={cn(
                    "font-mono text-xs",
                    ok ? "text-emerald-700" : "text-red-600",
                  )}
                >
                  {String(value)}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}
