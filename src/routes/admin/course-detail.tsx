import { Link, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  ActivityIcon,
  ArrowLeft,
  CircleDollarSign,
  Cpu,
  HardDrive,
  RotateCcw,
} from "lucide-react";
import {
  useCourseAudit,
  useCourseProcessingJobs,
  useRestoreCourse,
} from "@/lib/api/hooks/admin";
import {
  usePermissions,
  useRequirePermission,
} from "@/lib/auth/use-permissions";
import { StatCard } from "@/components/ui/stat-card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { ProcessingJobRow } from "@/lib/api/types";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { JobStatusBadge } from "@/components/ui/status-badges";

function useFormatters() {
  const { i18n } = useTranslation();
  const locale =
    (i18n.resolvedLanguage ?? i18n.language ?? "en") === "vi"
      ? "vi-VN"
      : "en-US";
  return {
    formatDate: (iso: string | null | undefined): string => {
      if (!iso) return "—";
      return new Intl.DateTimeFormat(locale, {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(iso));
    },
    formatNumber: (n: number | undefined | null): string => {
      if (n === undefined || n === null) return "—";
      return new Intl.NumberFormat(locale).format(n);
    },
    formatUsd: (n: number | undefined | null): string => {
      if (n === undefined || n === null) return "—";
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 4,
        maximumFractionDigits: 6,
      }).format(n);
    },
  };
}

function JobsTable({ jobs }: { jobs: ProcessingJobRow[] }) {
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

export default function AdminCourseDetailPage() {
  const { t } = useTranslation();
  const { formatDate, formatNumber, formatUsd } = useFormatters();
  const params = useParams({ strict: false }) as { courseId?: string };
  const courseId = params.courseId ?? "";

  const permissions = usePermissions();
  const canAdmin = permissions.has("system.administer");

  useRequirePermission(canAdmin, {
    messageKey: "common.no_permission",
  });

  const enabled = !permissions.isLoading && canAdmin && Boolean(courseId);
  const audit = useCourseAudit(enabled ? courseId : "");
  const jobs = useCourseProcessingJobs(enabled ? courseId : "", 20);
  const restore = useRestoreCourse();

  if (permissions.isLoading || !canAdmin) {
    return (
      <div className="space-y-3 pb-12">
        <div className="h-6 w-40 bg-surface-muted animate-pulse rounded" />
        <div className="h-24 bg-surface-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const handleRestore = () => {
    restore.mutate(courseId, {
      onSuccess: () => toast.success(t("admin.course_detail.toasts.restored")),
      onError: (err) =>
        toast.error(
          (err as Error).message ||
            t("admin.course_detail.toasts.restore_failed"),
        ),
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: t("sections.admin"), to: "/admin/stats" },
          { label: t("nav.courses"), to: "/admin/courses" },
          { label: t("admin.course_detail.title") },
        ]}
      />
      <Link
        to="/admin/courses"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-strong"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("admin.course_detail.back_to_list")}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-text-strong">
            {t("admin.course_detail.title")}
          </h1>
          <p className="text-sm text-text-muted mt-1 font-mono break-all">
            {courseId}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRestore}
          disabled={restore.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-m3-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {restore.isPending
            ? t("admin.course_detail.restoring")
            : t("admin.course_detail.restore")}
        </button>
      </div>

      {audit.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            {t("admin.course_detail.audit_load_failed")}
          </p>
        </div>
      ) : audit.isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 bg-surface-muted animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label={t("admin.course_detail.stats.total_cost")}
              value={formatUsd(audit.data?.total_cost_usd)}
              icon={CircleDollarSign}
            />
            <StatCard
              label={t("admin.course_detail.stats.tokens")}
              value={formatNumber(
                (audit.data?.total_input_tokens ?? 0) +
                  (audit.data?.total_output_tokens ?? 0),
              )}
              icon={Cpu}
            />
            <StatCard
              label={t("admin.course_detail.stats.calls")}
              value={formatNumber(audit.data?.total_calls)}
              icon={ActivityIcon}
            />
            <StatCard
              label={t("admin.course_detail.stats.pipeline_runs")}
              value={formatNumber(audit.data?.pipeline_runs)}
              icon={HardDrive}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-elev border border-border rounded-lg p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                {t("admin.course_detail.stats.input_tokens")}
              </p>
              <p className="text-lg font-bold text-text-strong mt-1">
                {formatNumber(audit.data?.total_input_tokens)}
              </p>
            </div>
            <div className="bg-surface-elev border border-border rounded-lg p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                {t("admin.course_detail.stats.output_tokens")}
              </p>
              <p className="text-lg font-bold text-text-strong mt-1">
                {formatNumber(audit.data?.total_output_tokens)}
              </p>
            </div>
            <div className="bg-surface-elev border border-border rounded-lg p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                {t("admin.course_detail.stats.first_call")}
              </p>
              <p className="text-sm text-text-strong mt-1">
                {formatDate(audit.data?.first_call_at)}
              </p>
            </div>
            <div className="bg-surface-elev border border-border rounded-lg p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                {t("admin.course_detail.stats.last_call")}
              </p>
              <p className="text-sm text-text-strong mt-1">
                {formatDate(audit.data?.last_call_at)}
              </p>
            </div>
          </div>
        </>
      )}

      <div>
        <h2 className="text-lg font-headline font-bold text-text-strong mb-3">
          {t("admin.course_detail.recent_jobs")}
        </h2>
        {jobs.isError ? (
          <div className="bg-surface-elev border border-border rounded-lg p-5">
            <p className="text-sm text-danger">
              {t("admin.course_detail.jobs_load_failed")}
            </p>
          </div>
        ) : jobs.isLoading ? (
          <PageSkeleton
            rows={3}
            height="h-12"
            rounded="rounded-lg"
            bg="bg-surface-muted"
            gap="space-y-2"
          />
        ) : (
          <JobsTable jobs={jobs.data ?? []} />
        )}
      </div>
    </div>
  );
}
