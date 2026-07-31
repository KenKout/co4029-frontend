import { BookOpen, FileText, Workflow } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useContentStats } from "@/lib/api/hooks/admin";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { MaterialTypeIcon } from "@/components/ui/material-type-icon";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { cn } from "@/lib/utils";

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

/**
 * Pull the label + count out of one breakdown bucket.
 *
 * The admin stats endpoint returns `list[dict[str, Any]]` per breakdown, and the
 * label key differs by query: `courses_by_status` and
 * `processing_jobs_by_status` use `status`, while `materials_by_type` uses
 * `material_type`. The old fixed list (`status`/`type`/`kind`/`name`) missed
 * `material_type` — `"type" !== "material_type"` — so every material row
 * rendered its label as "—" while the counts came through fine.
 *
 * Rather than extend the guess list and hit this again on the next breakdown,
 * fall back to "the first string value that isn't the count". A bucket is only
 * ever {label-ish, count}, so that generalises to any new breakdown the backend
 * adds.
 */
function readBucket(bucket: Bucket): { label: string; count: unknown } {
  const COUNT_KEYS = ["count", "total", "n"];
  const countKey = COUNT_KEYS.find(
    (k) => k in bucket && typeof bucket[k] === "number",
  );
  // Preferred keys first (stable column ordering when a bucket has several
  // strings), then any remaining string field.
  const labelKey =
    ["status", "type", "material_type", "kind", "name"].find(
      (k) => k in bucket && typeof bucket[k] === "string",
    ) ??
    Object.keys(bucket).find(
      (k) => !COUNT_KEYS.includes(k) && typeof bucket[k] === "string",
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
  showTypeIcons = false,
}: {
  title: string;
  icon: typeof BookOpen;
  buckets: Bucket[] | undefined;
  labelHeader: string;
  /**
   * Render a per-row material-type icon chip. Only meaningful for
   * `materials_by_type`; the status breakdowns have no icon vocabulary.
   */
  showTypeIcons?: boolean;
}) {
  const { t } = useTranslation();
  const formatCount = useFormatCount();
  const rows: BreakdownRow[] = (buckets ?? []).map((bucket, idx) => ({
    id: String(idx),
    ...readBucket(bucket),
  }));
  // Largest count drives the proportion bars, so a breakdown reads as a
  // distribution rather than a column of bare numbers.
  const maxCount = rows.reduce(
    (acc, r) => (typeof r.count === "number" && r.count > acc ? r.count : acc),
    0,
  );
  const total = rows.reduce(
    (acc, r) => (typeof r.count === "number" ? acc + r.count : acc),
    0,
  );
  const columns: DataTableColumn<BreakdownRow>[] = [
    {
      id: "label",
      header: labelHeader,
      cell: (r) => (
        <span className="flex items-center gap-2.5">
          {showTypeIcons && <MaterialTypeIcon materialType={r.label} />}
          <span
            className={cn(
              "text-text-strong font-medium",
              // File extensions read better uppercased (PDF, XLSX); status
              // values like "published" would just look shouty.
              showTypeIcons && "uppercase text-xs tracking-wide",
            )}
          >
            {r.label}
          </span>
        </span>
      ),
    },
    {
      id: "share",
      header: t("admin.stats.labels.share"),
      cell: (r) => {
        if (typeof r.count !== "number" || maxCount === 0) return null;
        const pctOfMax = (r.count / maxCount) * 100;
        const pctOfTotal = total > 0 ? (r.count / total) * 100 : 0;
        return (
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-24 rounded-full bg-surface-muted overflow-hidden sm:w-32">
              <span
                className="block h-full rounded-full bg-m3-primary"
                style={{ width: `${Math.max(pctOfMax, 2)}%` }}
              />
            </span>
            <span className="text-xs tabular-nums text-text-muted">
              {pctOfTotal.toFixed(0)}%
            </span>
          </span>
        );
      },
    },
    {
      id: "count",
      header: t("admin.stats.labels.count"),
      align: "right",
      cell: (r) => (
        <span className="font-medium text-text-strong tabular-nums">
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
        <PageSkeleton
          rows={3}
          height="h-32"
          bg="bg-surface-muted"
          gap="space-y-4"
        />
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
            showTypeIcons
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
