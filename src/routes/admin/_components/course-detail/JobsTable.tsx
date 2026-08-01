import { ActivityIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { ProcessingJobRow } from "@/lib/api/types";
import { JobStatusBadge } from "@/components/ui/status-badges";

import { useFormatters } from "./use-formatters";

export function JobsTable({ jobs }: { jobs: ProcessingJobRow[] }) {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();
  const columns: DataTableColumn<ProcessingJobRow>[] = [
    {
      id: "job_type",
      header: t("admin.course_detail.cols.job_type"),
      cell: (job) => (
        <span className="font-medium text-text-strong">{job.job_type}</span>
      ),
    },
    {
      id: "entity",
      header: t("admin.course_detail.cols.entity"),
      cell: (job) => (
        <span className="font-mono text-xs text-text-muted">
          {job.entity_type}/{job.entity_id.slice(0, 8)}…
        </span>
      ),
    },
    {
      id: "status",
      header: t("admin.course_detail.cols.status"),
      cell: (job) => <JobStatusBadge status={job.status} />,
    },
    {
      id: "progress",
      header: t("admin.course_detail.cols.progress"),
      cell: (job) => (
        <span className="text-text-strong">{job.progress_percent}%</span>
      ),
    },
    {
      id: "retries",
      header: t("admin.course_detail.cols.retries"),
      cell: (job) => <span className="text-text-muted">{job.retry_count}</span>,
    },
    {
      id: "updated",
      header: t("admin.course_detail.cols.updated"),
      cell: (job) => (
        <span className="text-xs text-text-muted">
          {formatDate(job.updated_at)}
        </span>
      ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={jobs}
      getRowId={(job) => job.id}
      pagination
      pageSize={10}
      pageSizeOptions={[10, 20]}
      emptyState={
        <div className="flex flex-col items-center gap-2">
          <ActivityIcon className="h-8 w-8 text-text-subtle" />
          <p className="text-sm text-text-muted">
            {t("admin.course_detail.no_jobs")}
          </p>
        </div>
      }
    />
  );
}
