import { BookOpen, FileText, Workflow } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useContentStats } from "@/lib/api/hooks/admin";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

type Bucket = { [key: string]: unknown };
type BreakdownRow = { id: string; label: string; count: unknown };

function useFormatCount() {
  const { i18n } = useTranslation();
  const locale =
    (i18n.resolvedLanguage ?? i18n.language ?? "en") === "vi"
      ? "vi-VN"
      : "en-US";
  return (n: unknown): string => {
    if (typeof n === "number") return new Intl.NumberFormat(locale).format(n);
    return "—";
  };
}

function readBucket(bucket: Bucket): { label: string; count: unknown } {
  const labelKey = ["status", "type", "kind", "name"].find(
    (k) => k in bucket && typeof bucket[k] === "string",
  );
  const countKey = ["count", "total", "n"].find(
    (k) => k in bucket && typeof bucket[k] === "number",
  );
  return {
    label: labelKey ? String(bucket[labelKey]) : "—",
    count: countKey ? bucket[countKey] : "—",
  };
}

function BreakdownTable({
  title,
  icon: Icon,
  buckets,
  labelHeader,
}: {
  title: string;
  icon: typeof BookOpen;
  buckets: Bucket[] | undefined;
  labelHeader: string;
}) {
  const { t } = useTranslation();
  const formatCount = useFormatCount();
  const rows: BreakdownRow[] = (buckets ?? []).map((bucket, idx) => ({
    id: String(idx),
    ...readBucket(bucket),
  }));
  const columns: DataTableColumn<BreakdownRow>[] = [
    {
      id: "label",
      header: labelHeader,
      cell: (r) => <span className="text-text-strong">{r.label}</span>,
    },
    {
      id: "count",
      header: t("admin.stats.labels.count"),
      align: "right",
      cell: (r) => (
        <span className="font-medium text-text-strong">
          {formatCount(r.count)}
        </span>
      ),
    },
  ];
  return (
    <div className="bg-surface-elev border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-m3-primary-fixed flex items-center justify-center">
          <Icon className="h-4 w-4 text-m3-primary" />
        </div>
        <h2 className="font-headline font-semibold text-text-strong">
          {title}
        </h2>
      </div>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        bordered={false}
        emptyState={t("admin.stats.empty_in_scope")}
      />
    </div>
  );
}

export default function AdminStatsContentPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useContentStats();

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-headline font-bold text-text-strong">
          {t("admin.stats.title_content")}
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {t("admin.stats.subtitle_content")}
        </p>
      </div>

      {isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">{t("admin.stats.load_failed")}</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-surface-muted animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <BreakdownTable
            title={t("admin.stats.content.courses_by_status")}
            icon={BookOpen}
            buckets={data?.courses_by_status}
            labelHeader={t("admin.stats.labels.status")}
          />
          <BreakdownTable
            title={t("admin.stats.content.materials_by_type")}
            icon={FileText}
            buckets={data?.materials_by_type}
            labelHeader={t("admin.stats.labels.type")}
          />
          <BreakdownTable
            title={t("admin.stats.content.processing_jobs_by_status")}
            icon={Workflow}
            buckets={data?.processing_jobs_by_status}
            labelHeader={t("admin.stats.labels.status")}
          />
        </div>
      )}
    </div>
  );
}
