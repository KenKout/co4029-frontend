import { useEffect } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useProcessingJob, useRetryProcessingJob } from "@/lib/api/hooks/admin";
import { usePermissions } from "@/lib/auth/use-permissions";
import { ApiError } from "@/lib/api/client";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";

const JOB_STATUS_COLOR: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-slate-200 text-slate-700",
};

function JobStatusBadge({ status }: { status: string }) {
  const cls = JOB_STATUS_COLOR[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md ${cls}`}
    >
      {status}
    </span>
  );
}

function useFormatDate() {
  const { i18n } = useTranslation();
  const locale =
    (i18n.resolvedLanguage ?? i18n.language ?? "en") === "vi"
      ? "vi-VN"
      : "en-US";
  return (iso: string | null | undefined): string => {
    if (!iso) return "—";
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  };
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold text-text-muted uppercase tracking-wide">
        {label}
      </dt>
      <dd
        className={
          mono
            ? "text-sm text-text-strong mt-1 font-mono break-all"
            : "text-sm text-text-strong mt-1"
        }
      >
        {value}
      </dd>
    </div>
  );
}

export default function AdminProcessingJobPage() {
  const { t } = useTranslation();
  const formatDate = useFormatDate();
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { jobId?: string };
  const jobId = params.jobId ?? "";

  const permissions = usePermissions();
  const canAdmin = permissions.has("system.administer");

  useEffect(() => {
    if (permissions.isLoading) return;
    if (!canAdmin) {
      toast.error(t("admin.users.roles.errors.no_permission"));
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [permissions.isLoading, canAdmin, navigate, t]);

  const enabled = !permissions.isLoading && canAdmin && Boolean(jobId);
  const job = useProcessingJob(enabled ? jobId : "");
  const retry = useRetryProcessingJob();

  if (permissions.isLoading || !canAdmin) {
    return (
      <div className="space-y-3 pb-12">
        <div className="h-6 w-40 bg-surface-muted animate-pulse rounded" />
        <div className="h-32 bg-surface-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const handleRetry = () => {
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
    });
  };

  const data = job.data;
  const isFailed = data?.status === "failed";

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: t("sections.admin"), to: "/admin/stats" },
          { label: t("admin.processing.title"), to: "/admin/processing" },
          { label: data?.job_type ?? t("admin.processing_job.title") },
        ]}
      />
      <Link
        to="/admin/processing"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-strong"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("admin.processing_job.back_to_queue")}
      </Link>

      {job.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            {t("admin.processing_job.load_failed")}
          </p>
        </div>
      ) : job.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      ) : data ? (
        <>
          <div className="bg-surface-elev border border-border rounded-xl p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-headline font-bold text-text-strong">
                    {data.job_type}
                  </h1>
                  <JobStatusBadge status={data.status} />
                </div>
                <p className="text-xs text-text-subtle mt-2 font-mono break-all">
                  {data.id}
                </p>
              </div>
              {isFailed ? (
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={retry.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-m3-primary text-white hover:opacity-90 disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {retry.isPending
                    ? t("admin.users.actions.disabling")
                    : t("admin.processing.retry")}
                </button>
              ) : null}
            </div>
          </div>

          <div className="bg-surface-elev border border-border rounded-lg p-5">
            <h2 className="text-sm font-headline font-bold text-text-strong mb-4">
              {t("admin.processing_job.title")}
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <Field
                label={t("admin.processing_job.fields.entity_type")}
                value={data.entity_type}
              />
              <Field
                label={t("admin.processing_job.fields.entity_id")}
                value={data.entity_id}
                mono
              />
              <Field
                label={t("admin.processing_job.stats.progress")}
                value={`${data.progress_percent}%`}
              />
              <Field
                label={t("admin.processing_job.stats.retries")}
                value={data.retry_count}
              />
              <Field
                label={t("admin.processing_job.fields.started_at")}
                value={formatDate(data.started_at)}
              />
              <Field
                label={t("admin.processing_job.fields.completed_at")}
                value={formatDate(data.finished_at)}
              />
              <Field
                label={t("admin.processing_job.fields.created_at")}
                value={formatDate(data.created_at)}
              />
              <Field
                label={t("admin.course_detail.cols.updated")}
                value={formatDate(data.updated_at)}
              />
            </dl>
          </div>

          {data.error_message ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-5">
              <h2 className="text-sm font-headline font-bold text-red-700 mb-2">
                {t("admin.processing_job.fields.error")}
              </h2>
              <pre className="text-xs text-red-700 whitespace-pre-wrap break-all font-mono">
                {data.error_message}
              </pre>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
