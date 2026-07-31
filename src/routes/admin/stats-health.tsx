import { useMemo, useState } from "react";
import { AlertTriangle, Bot, Loader, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStatsHealth } from "@/lib/api/hooks/admin";
import { useFormatCount } from "@/lib/format/number";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import { PageSkeleton } from "@/components/ui/page-skeleton";

type MetricRow = {
  key: string;
  label: string;
  desc: string;
  value: number | undefined;
  icon: LucideIcon;
};

type Window = "24h" | "7d" | "30d";

const WINDOW_HOURS: Record<Window, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
};

export default function AdminStatsHealthPage() {
  const { t } = useTranslation();
  const formatCount = useFormatCount();
  const [windowKey, setWindowKey] = useState<Window>("24h");

  const since = useMemo(() => {
    const ms = WINDOW_HOURS[windowKey] * 60 * 60 * 1000;
    return new Date(Date.now() - ms).toISOString();
  }, [windowKey]);

  const { data, isLoading, isError } = useStatsHealth(since);

  const rows: MetricRow[] = [
    {
      key: "failed_jobs",
      label: t("admin.stats.health.rows.failed_jobs_label"),
      desc: t("admin.stats.health.rows.failed_jobs_desc"),
      value: data?.failed_jobs_count,
      icon: AlertTriangle,
    },
    {
      key: "in_flight_jobs",
      label: t("admin.stats.health.rows.in_flight_jobs_label"),
      desc: t("admin.stats.health.rows.in_flight_jobs_desc"),
      value: data?.in_flight_jobs_count,
      icon: Loader,
    },
    {
      key: "failed_ai_calls",
      label: t("admin.stats.health.rows.failed_ai_calls_label"),
      desc: t("admin.stats.health.rows.failed_ai_calls_desc"),
      value: data?.failed_ai_calls_count,
      icon: Bot,
    },
  ];

  const columns: DataTableColumn<MetricRow>[] = [
    {
      id: "metric",
      header: t("admin.stats.labels.metric"),
      cell: (row) => {
        const Icon = row.icon;
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-m3-primary-fixed flex items-center justify-center">
              <Icon className="h-4 w-4 text-m3-primary" />
            </div>
            <span className="font-medium text-text-strong">{row.label}</span>
          </div>
        );
      },
    },
    {
      id: "description",
      header: t("admin.stats.labels.description"),
      cell: (row) => <span className="text-text-muted">{row.desc}</span>,
    },
    {
      id: "value",
      header: t("admin.stats.labels.value"),
      align: "right",
      cell: (row) => (
        <span className="font-heading font-semibold text-text-strong">
          {formatCount(row.value)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-text-strong">
            {t("admin.stats.title_health")}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {t("admin.stats.health.subtitle")}
          </p>
        </div>

        <div>
          <label
            htmlFor="health-window"
            className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1"
          >
            {t("admin.stats.health.window_label")}
          </label>
          <Select<Window>
            id="health-window"
            value={windowKey}
            onValueChange={(next) => setWindowKey(next)}
            options={(Object.keys(WINDOW_HOURS) as Window[]).map((w) => ({
              value: w,
              label: t(`admin.stats.health.windows.${w}`),
            }))}
            className="w-40"
          />
        </div>
      </div>

      {isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">{t("admin.stats.load_failed")}</p>
        </div>
      ) : isLoading ? (
        <PageSkeleton rows={3} bg="bg-surface-muted" />
      ) : !data ? (
        <div className="bg-surface-elev border border-border rounded-lg p-10 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-text-subtle" />
          <p className="text-sm font-medium text-text-strong">
            {t("admin.stats.empty_in_scope")}
          </p>
        </div>
      ) : (
        <DataTable columns={columns} data={rows} getRowId={(row) => row.key} />
      )}
    </div>
  );
}
