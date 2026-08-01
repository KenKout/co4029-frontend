import { Activity, RefreshCw } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { ProcessingJobOut } from "@/lib/api/types";
import { JobStatusBadge } from "@/components/ui/status-badges";

import { formatDate } from "./helpers";

export function JobsTable({
  jobs,
  onRetry,
  retryingId,
}: {
  jobs: ProcessingJobOut[];
  onRetry: (jobId: string) => void;
  retryingId: string | null;
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? "en";

  const columns: DataTableColumn<ProcessingJobOut>[] = [
    {
      id: "job",
      header: t("admin.processing.cols.job"),
      cell: (job) => (
        <Link
          to="/admin/processing/$jobId"
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
      cell: (job) => (
        <span className="text-text-strong">{job.progress_percent}%</span>
      ),
    },
    {
      id: "retries",
      header: t("admin.processing.cols.retries"),
      cell: (job) => <span className="text-text-muted">{job.retry_count}</span>,
    },
    {
      id: "updated",
      header: t("admin.processing.cols.updated"),
      cell: (job) => (
        <span className="text-xs text-text-muted">
          {formatDate(job.updated_at, locale)}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={jobs}
      getRowId={(job) => job.id}
      onRowClick={(job) =>
        void navigate({
          to: "/admin/processing/$jobId",
          params: { jobId: job.id },
        })
      }
      pagination
      pageSize={15}
      pageSizeOptions={[15, 30, 50]}
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
          <button
            type="button"
            onClick={() => onRetry(job.id)}
            disabled={retryingId === job.id}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md bg-m3-primary text-white hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            {retryingId === job.id ? "…" : t("admin.processing.retry")}
          </button>
        ) : null
      }
    />
  );
}
