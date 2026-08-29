import {
  Activity,
  Calendar,
  CalendarDays,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useActiveUsersStats } from "@/lib/api/hooks/admin";
import { useFormatCount } from "@/lib/format/number";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { ActiveUsersTrendSection } from "./_components/stats/ActiveUsersTrendSection";
import { addDays, toIso } from "./_components/stats/date-range";

type MetricRow = {
  key: string;
  label: string;
  desc: string;
  value: number | undefined;
  icon: LucideIcon;
};

/** Fixed fallback window for the standalone page (see the note below). */
const LAST_30_DAYS = {
  from: toIso(addDays(new Date(), -29)),
  to: toIso(new Date()),
};

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

      {/* This standalone page has no date-range filter of its own, so the
          chart keeps a fixed 30-day window here. It picks up the page range
          once this section moves onto the dashboard under Usage & Capacity —
          which is the point of the merge. */}
      <ActiveUsersTrendSection range={LAST_30_DAYS} />

      {isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">{t("admin.stats.load_failed")}</p>
        </div>
      ) : isLoading ? (
        <PageSkeleton rows={3} bg="bg-surface-muted" />
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
