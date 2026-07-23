import { useTranslation } from "react-i18next";
import { useHealthz, useReadyz } from "@/lib/api/hooks/infra";
import type { HealthzResponse, ReadyzResponse } from "@/lib/api/hooks/infra";

function StatusBadge({ status }: { status: string | undefined }) {
  const { t } = useTranslation();
  if (!status) return null;

  const color =
    status === "ok"
      ? "bg-emerald-100 text-emerald-700"
      : status === "degraded"
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";

  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md ${color}`}
    >
      {t(`admin.health.status.${status}`, { defaultValue: status })}
    </span>
  );
}

function deriveStatus(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const obj = data as Record<string, unknown>;

  if (typeof obj.status === "string") return obj.status;

  const values = Object.values(obj);
  if (values.length === 0) return undefined;

  const isOk = (v: unknown): boolean => v === "ok" || v === true;
  const isFailLike = (v: unknown): boolean =>
    v === false || v === "down" || v === "failed" || v === "error";

  if (values.every(isOk)) return "ok";
  if (values.some(isFailLike)) return "down";
  return "degraded";
}

function HealthCard({
  title,
  data,
  isLoading,
  isError,
  dataUpdatedAt,
}: {
  title: string;
  data: HealthzResponse | ReadyzResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  dataUpdatedAt: number;
}) {
  const { t, i18n } = useTranslation();
  const locale =
    (i18n.resolvedLanguage ?? i18n.language ?? "en") === "vi"
      ? "vi-VN"
      : "en-US";
  const status = deriveStatus(data);
  const lastFetched = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString(locale)
    : "—";

  const detailRows: Array<[string, string]> = [];
  if (data && typeof data === "object") {
    for (const [k, v] of Object.entries(data)) {
      if (k === "status") continue;
      detailRows.push([
        k,
        typeof v === "boolean" ? (v ? "ok" : "down") : String(v),
      ]);
    }
  }

  if (isLoading) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-5">
        <div className="h-4 w-32 bg-surface-muted animate-pulse rounded" />
        <div className="h-6 w-16 bg-surface-muted animate-pulse rounded mt-3" />
        <div className="h-3 w-24 bg-surface-muted animate-pulse rounded mt-2" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-5">
        <h3 className="text-sm font-semibold text-text-strong">{title}</h3>
        <p className="text-xs text-red-600 mt-2">
          {t("admin.health.cannot_connect")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-elev border border-border rounded-lg p-5">
      <h3 className="text-sm font-semibold text-text-strong">{title}</h3>
      <div className="mt-3">
        <StatusBadge status={status} />
      </div>
      {detailRows.length > 0 && (
        <dl className="mt-3 grid grid-cols-1 gap-1 text-xs">
          {detailRows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3">
              <dt className="text-text-muted">{k}</dt>
              <dd
                className={
                  v === "ok"
                    ? "font-mono text-emerald-700"
                    : v === "down" || v === "false" || v === "failed"
                      ? "font-mono text-red-600"
                      : "font-mono text-text-strong"
                }
              >
                {v}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <p className="text-xs text-text-muted mt-2">
        {t("admin.health.updated_at", { time: lastFetched })}
      </p>
    </div>
  );
}

export default function AdminHealthPage() {
  const { t } = useTranslation();
  const healthz = useHealthz();
  const readyz = useReadyz();

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-headline font-bold text-text-strong">
          {t("admin.health.title")}
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {t("admin.health.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <HealthCard
          title={t("admin.health.healthz_card")}
          data={healthz.data}
          isLoading={healthz.isLoading}
          isError={healthz.isError}
          dataUpdatedAt={healthz.dataUpdatedAt}
        />
        <HealthCard
          title={t("admin.health.readyz_card")}
          data={readyz.data}
          isLoading={readyz.isLoading}
          isError={readyz.isError}
          dataUpdatedAt={readyz.dataUpdatedAt}
        />
      </div>
    </div>
  );
}
