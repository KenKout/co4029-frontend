import {
  Activity,
  Calendar,
  CalendarDays,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useActiveUsersStats } from "@/lib/api/hooks/admin";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

type MetricRow = {
  key: string;
  label: string;
  desc: string;
  value: number | undefined;
  icon: LucideIcon;
};

function useFormatCount() {
  const { i18n } = useTranslation();
  const locale =
    (i18n.resolvedLanguage ?? i18n.language ?? "en") === "vi"
      ? "vi-VN"
      : "en-US";
  return (n: number | undefined): string => {
    if (n === undefined || n === null) return "—";
    return new Intl.NumberFormat(locale).format(n);
  };
}

export default function AdminStatsActivePage() {
  const { t } = useTranslation();
  const formatCount = useFormatCount();
  const { data, isLoading, isError } = useActiveUsersStats();

  const rows: MetricRow[] = [
    {
      key: "dau",
      label: t("admin.stats.active.dau_label"),
      desc: t("admin.stats.active.dau_desc"),
      value: data?.dau,
      icon: Activity,
    },
    {
      key: "wau",
      label: t("admin.stats.active.wau_label"),
      desc: t("admin.stats.active.wau_desc"),
      value: data?.wau,
      icon: Calendar,
    },
    {
      key: "mau",
      label: t("admin.stats.active.mau_label"),
      desc: t("admin.stats.active.mau_desc"),
      value: data?.mau,
      icon: CalendarDays,
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
      <div>
        <h1 className="text-2xl font-headline font-bold text-text-strong">
          {t("admin.stats.title_active_users")}
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {t("admin.stats.subtitle_active_users")}
        </p>
      </div>

      {isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">{t("admin.stats.load_failed")}</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-surface-muted animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : !data ? (
        <div className="bg-surface-elev border border-border rounded-lg p-10 text-center">
          <Users className="h-10 w-10 mx-auto mb-3 text-text-subtle" />
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
