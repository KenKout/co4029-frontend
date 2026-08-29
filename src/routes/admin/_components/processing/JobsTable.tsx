import { Activity, ChevronRight, RefreshCw } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import {
  DataTable,
  type DataTableColumn,
} from "@/components/ui/data-table";
import {
  DataTableToolbar,
  type CustomTimeRange,
  type TimeRange,
  type TimeRangeOption,
} from "@/components/ui/data-table-toolbar";
import type { ProcessingJobOut } from "@/lib/api/types";
import { JobStatusBadge } from "@/components/ui/status-badges";
import { Button } from "@/components/ui/button";

import { formatDate } from "./helpers";

function buildTimeRangeOptions(t: TFunction): TimeRangeOption[] {
  return [
    { value: "today", label: t("admin.processing.time.today") },
    { value: "yesterday", label: t("admin.processing.time.yesterday") },
    { value: "week", label: t("admin.processing.time.week") },
    { value: "month", label: t("admin.processing.time.month") },
    { value: "6months", label: t("admin.processing.time.six_months") },
    { value: "year", label: t("admin.processing.time.year") },
    { value: "all", label: t("admin.processing.time.all") },
  ];
}

function buildColumns(
  t: TFunction,
  locale: string,
): DataTableColumn<ProcessingJobOut>[] {
  return [
    {
      id: "job",
      header: t("admin.processing.cols.job"),
      cell: (job) => (
        <Link
          to="/admin/operations/jobs/$jobId"
          params={{ jobId: job.id }}
          onClick={(e) => e.stopPropagation()}
          className="text-text-strong font-medium hover:underline"
        >
          {job.job_type}
        </Link>
      ),
    },
    {
      id: "entity",
      header: t("admin.processing.cols.entity"),
      cell: (job) => (
        <span className="font-mono text-xs text-text-muted">
          {job.entity_type}/{job.entity_id.slice(0, 8)}…
        </span>
      ),
    },
    {
      id: "status",
      header: t("admin.processing.cols.status"),
      cell: (job) => <JobStatusBadge status={job.status} />,
    },
    {
      id: "progress",
      header: t("admin.processing.cols.progress"),
      align: "right",
      sortable: true,
      sortValue: (job) => job.progress_percent,
      cell: (job) => (
        <span className="text-text-strong">{job.progress_percent}%</span>
      ),
    },
    {
      id: "retries",
      header: t("admin.processing.cols.retries"),
      align: "right",
      sortable: true,
      sortValue: (job) => job.retry_count,
      cell: (job) => (
        <span className="text-text-muted">{job.retry_count}</span>
      ),
    },
    {
      id: "updated",
      header: t("admin.processing.cols.updated"),
      sortable: true,
      sortValue: (job) => job.updated_at,
      cell: (job) => (
        <span className="text-xs text-text-muted">
          {formatDate(job.updated_at, locale)}
        </span>
      ),
    },
  ];
}

export function JobsTable({
  jobs,
  onRetry,
  retryingId,
  timeRange,
  onTimeRangeChange,
  customRange,
  onCustomRangeChange,
  search,
  onSearchChange,
}: {
  jobs: ProcessingJobOut[];
  onRetry: (jobId: string) => void;
  retryingId: string | null;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  customRange?: CustomTimeRange;
  onCustomRangeChange?: (range: CustomTimeRange | undefined) => void;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? "en";

  const columns = buildColumns(t, locale);
  const timeRangeOptions = buildTimeRangeOptions(t);

  return (
    <DataTable
      columns={columns}
      data={jobs}
      getRowId={(job) => job.id}
      onRowClick={(job) =>
        void navigate({
          to: "/admin/operations/jobs/$jobId",
          params: { jobId: job.id },
        })
      }
      pagination
      pageSize={15}
      pageSizeOptions={[15, 30, 50]}
      toolbar={
        <DataTableToolbar
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder={t("admin.processing.search_placeholder")}
          timeRange={timeRange}
          onTimeRangeChange={onTimeRangeChange}
          timeRangeOptions={timeRangeOptions}
          timeRangeAriaLabel={t("admin.processing.time_filter")}
          customTimeRange={customRange}
          onCustomTimeRangeChange={onCustomRangeChange}
          timeRangeLabels={{
            customOption: t("admin.processing.time.custom"),
            dialogTitle: t("admin.processing.time.custom_title"),
            from: t("admin.processing.time.from"),
            to: t("admin.processing.time.to"),
            apply: t("admin.processing.time.apply"),
            clear: t("admin.processing.time.clear"),
          }}
        />
      }
      emptyState={
        <div className="flex flex-col items-center gap-2">
          <Activity className="h-8 w-8 text-text-subtle" />
          <p className="text-sm text-text-muted">
            {t("admin.processing.no_jobs_match")}
          </p>
        </div>
      }
      actionsHeader={t("admin.processing.cols.actions")}
      actions={(job) =>
        job.status === "failed" ? (
          <Button variant="ghost"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRetry(job.id);
            }}
            disabled={retryingId === job.id}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md bg-m3-primary text-white hover:opacity-90 disabled:opacity-50 cursor-pointer h-auto whitespace-normal"
          >
            <RefreshCw className="h-3 w-3" />
            {retryingId === job.id ? "…" : t("admin.processing.retry")}
          </Button>
        ) : (
          // Non-failed rows get a "view" affordance so the column is never
          // empty (product feedback 2026-08-04).
          <Button variant="ghost"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void navigate({
                to: "/admin/operations/jobs/$jobId",
                params: { jobId: job.id },
              });
            }}
            aria-label={t("admin.processing.view_job")}
            title={t("admin.processing.view_job")}
            className="p-1 rounded-md text-text-subtle hover:text-m3-primary hover:bg-m3-primary/8 transition-colors cursor-pointer h-auto whitespace-normal"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )
      }
    />
  );
}
