import { useMemo, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PlayCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import {
  useProcessingJobs,
  useProcessingQueue,
  useRetryProcessingJob,
} from "@/lib/api/hooks/admin";
import {
  usePermissions,
  useRequirePermission,
} from "@/lib/auth/use-permissions";
import { ApiError } from "@/lib/api/client";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { ProcessingJobOut } from "@/lib/api/types";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { JobStatusBadge } from "@/components/ui/status-badges";
import { formatDateTime, resolveLocale } from "@/lib/format/date";

const STATUS_FILTERS = [
  { value: "", i18nKey: "admin.processing.filters.all" },
  { value: "pending", i18nKey: "admin.processing.filters.pending" },
  { value: "running", i18nKey: "admin.processing.filters.running" },
  { value: "completed", i18nKey: "admin.processing.filters.completed" },
  { value: "failed", i18nKey: "admin.processing.filters.failed" },
  { value: "cancelled", i18nKey: "admin.processing.filters.cancelled" },
] as const;

// Thin wrapper over the shared formatter; the call site passes the raw i18n
// language, resolveLocale maps it. Same short date+time output.
function formatDate(iso: string | null | undefined, language: string): string {
  return formatDateTime(iso, resolveLocale(language));
}

function formatNumber(n: number | undefined | null, locale: string): string {
  if (n === undefined || n === null) return "—";
  return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US").format(n);
}

function JobsTable({
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

export default function AdminProcessingPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const permissions = usePermissions();
  const canAdmin = permissions.has("system.administer");

  // Seed the filter from ?status= so the admin dashboard can deep-link straight
  // to the failed jobs ("Job failure rate" tile) instead of landing on the
  // unfiltered queue and making the operator re-select.
  const search = useSearch({ strict: false }) as { status?: string };
  const [statusFilter, setStatusFilter] = useState<string>(search.status ?? "");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useRequirePermission(canAdmin, {
    messageKey: "common.no_permission",
  });

  const queue = useProcessingQueue();
  const jobs = useProcessingJobs(
    statusFilter ? { status: statusFilter } : undefined,
  );
  const retry = useRetryProcessingJob();

  const sortedJobs = useMemo<ProcessingJobOut[]>(() => {
    const list = jobs.data ?? [];
    return [...list].sort((a, b) =>
      a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0,
    );
  }, [jobs.data]);

  if (permissions.isLoading || !canAdmin) {
    return (
      <div className="space-y-3 pb-12">
        <div className="h-6 w-40 bg-surface-muted animate-pulse rounded" />
        <div className="h-32 bg-surface-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const handleRetry = (jobId: string) => {
    setRetryingId(jobId);
    retry.mutate(jobId, {
      onSuccess: () => toast.success(t("admin.processing.toasts.queued")),
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          toast.error(t("admin.processing.toasts.only_failed"));
        } else {
          toast.error(
            (err as Error).message || t("admin.processing.toasts.retry_failed"),
          );
        }
      },
      onSettled: () => setRetryingId(null),
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-headline font-bold text-text-strong">
          {t("admin.processing.title")}
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {t("admin.processing.subtitle")}
        </p>
      </div>

      {queue.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            {t("admin.processing.queue_load_failed")}
          </p>
        </div>
      ) : queue.isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-24 bg-surface-muted animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            label={t("admin.processing.stats.total")}
            value={formatNumber(queue.data?.total, locale)}
            icon={Activity}
          />
          <StatCard
            label={t("admin.processing.stats.pending")}
            value={formatNumber(queue.data?.pending, locale)}
            icon={Clock}
          />
          <StatCard
            label={t("admin.processing.stats.running")}
            value={formatNumber(queue.data?.running, locale)}
            icon={PlayCircle}
          />
          <StatCard
            label={t("admin.processing.stats.completed")}
            value={formatNumber(queue.data?.completed, locale)}
            icon={CheckCircle2}
          />
          <StatCard
            label={t("admin.processing.stats.failed")}
            value={formatNumber(queue.data?.failed, locale)}
            icon={AlertTriangle}
          />
          <StatCard
            label={t("admin.processing.stats.cancelled")}
            value={formatNumber(queue.data?.cancelled, locale)}
            icon={XCircle}
          />
        </div>
      )}

      <div className="bg-surface-elev border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-text-muted mr-2">
            {t("admin.processing.filter_status")}:
          </span>
          {STATUS_FILTERS.map((opt) => {
            const active = statusFilter === opt.value;
            return (
              <button
                type="button"
                key={opt.value || "all"}
                onClick={() => setStatusFilter(opt.value)}
                className={
                  active
                    ? "px-3 py-1.5 text-xs font-semibold rounded-md bg-m3-primary text-white"
                    : "px-3 py-1.5 text-xs font-semibold rounded-md bg-surface-muted text-text-strong hover:bg-surface-muted/70"
                }
              >
                {t(opt.i18nKey)}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-headline font-bold text-text-strong mb-3">
          {t("admin.processing.recent_jobs")}
        </h2>
        {jobs.isError ? (
          <div className="bg-surface-elev border border-border rounded-lg p-5">
            <p className="text-sm text-danger">
              {t("admin.processing.jobs_load_failed")}
            </p>
          </div>
        ) : jobs.isLoading ? (
          <PageSkeleton
            rows={4}
            height="h-12"
            rounded="rounded-lg"
            bg="bg-surface-muted"
            gap="space-y-2"
          />
        ) : (
          <JobsTable
            jobs={sortedJobs}
            onRetry={handleRetry}
            retryingId={retryingId}
          />
        )}
      </div>
    </div>
  );
}
