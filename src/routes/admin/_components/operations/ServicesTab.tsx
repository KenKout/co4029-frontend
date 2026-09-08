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
 *
 * Rendered as a proper card (house stats style) whose rows speak operator
 * language: a named dependency, a state sentence, and an overall verdict —
 * never the raw `alembic_at_head: true` payload.
 */
const READY_CHECKS: {
  key: string;
  labelKey: string;
  descKey: string;
  descKeyDown: string;
}[] = [
  {
    key: "postgres",
    labelKey: "admin.health.readyz.postgres",
    descKey: "admin.health.readyz.reachable",
    descKeyDown: "admin.health.readyz.unreachable",
  },
  {
    key: "redis",
    labelKey: "admin.health.readyz.redis",
    descKey: "admin.health.readyz.reachable",
    descKeyDown: "admin.health.readyz.unreachable",
  },
  {
    key: "alembic_at_head",
    labelKey: "admin.health.readyz.schema",
    descKey: "admin.health.readyz.schema_ok",
    descKeyDown: "admin.health.readyz.schema_behind",
  },
];

function ReadinessSection() {
  const { t } = useTranslation();
  const readyz = useReadyz();

  // The probe returns 200 ONLY when every check passes (503 otherwise), so
  // "the endpoint answered" itself is a signal — but judge per-check from the
  // payload, not the HTTP code, to name WHICH check fails.
  const payload: Record<string, unknown> | undefined = readyz.data;
  const checkState = (key: string) => {
    if (!payload) return null;
    const value = payload[key];
    if (key === "alembic_at_head") return value === true;
    return value === "ok" || value === true;
  };
  const allReady = READY_CHECKS.every((c) => checkState(c.key) === true);

  return (
    <section className="rounded-xl bg-surface-elev ghost-border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-headline font-bold text-text-strong">
            {t("admin.health.readyz_card")}
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">
            {t("admin.health.readyz.subtitle")}
          </p>
        </div>
        {!readyz.isError && !readyz.isLoading && (
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              allReady
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600",
            )}
          >
            {allReady
              ? t("admin.health.readyz.verdict_ready")
              : t("admin.health.readyz.verdict_not_ready")}
          </span>
        )}
      </div>

      {readyz.isError ? (
        <div className="mt-4">
          <SectionErrorBox messageKey="admin.health.cannot_connect" />
        </div>
      ) : readyz.isLoading ? (
        <div className="mt-4">
          <PageSkeleton rows={1} height="h-20" bg="bg-surface-muted" />
        </div>
      ) : (
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {READY_CHECKS.map((check) => {
            const ok = checkState(check.key) === true;
            const known = checkState(check.key) !== null;
            return (
              <div
                key={check.key}
                className="rounded-lg border border-border bg-surface-elev p-4"
              >
                <dt className="flex items-center gap-2 text-sm font-medium text-text-strong">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      !known
                        ? "bg-text-muted"
                        : ok
                          ? "bg-emerald-600"
                          : "bg-red-600",
                    )}
                  />
                  {t(check.labelKey)}
                </dt>
                <dd
                  className={cn(
                    "mt-1 pl-4 text-xs",
                    !known
                      ? "text-text-muted"
                      : ok
                        ? "text-emerald-700"
                        : "text-red-600",
                  )}
                >
                  {!known
                    ? t("admin.dashboard.no_data")
                    : ok
                      ? t(check.descKey)
                      : t(check.descKeyDown)}
                </dd>
              </div>
            );
          })}
          {/* A payload key the UI does not know yet (backend added a check):
              surface it raw rather than silently hiding a failed gate. */}
          {Object.keys(payload ?? {})
            .filter((k) => !READY_CHECKS.some((c) => c.key === k))
            .map((k) => (
              <div
                key={k}
                className="rounded-lg border border-border bg-surface-elev p-4"
              >
                <dt className="font-mono text-sm text-text-strong">{k}</dt>
                <dd className="mt-1 text-xs text-text-muted">
                  {String(payload?.[k])}
                </dd>
              </div>
            ))}
        </dl>
      )}
    </section>
  );
}
