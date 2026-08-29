import { Link } from "@tanstack/react-router";
import { Building2, ChevronRight, Clock, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  JobAiCall,
  JobInvestigation,
  JobStage,
} from "@/lib/api/hooks/admin-jobs";
import { useFormatDateTimeMedium } from "@/lib/format/date";
import { formatElapsedLabel } from "@/lib/format/date";
import { cn } from "@/lib/utils";

/**
 * The investigation half of the job-detail page (PRD ADM-013/014).
 *
 * Everything here existed in the database already and was reachable only by
 * copying the job id into another screen: who the job belongs to, how long it
 * waited versus how long it ran, which pipeline stage burned the time, which
 * AI call failed, and the request that started it. Putting them on one page is
 * the whole requirement — the data was never the missing part.
 */

export function JobInvestigationSections({
  data,
  isLoading,
  isError,
}: {
  data: JobInvestigation | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  const { t } = useTranslation();

  if (isError) {
    return (
      <div className="rounded-lg border border-border bg-surface-elev p-5">
        <p className="text-sm text-danger">
          {t("admin.processing_job.investigation.load_failed")}
        </p>
      </div>
    );
  }
  if (isLoading || !data) {
    return <Skeleton className="h-40 rounded-lg" />;
  }

  return (
    <>
      <OwnerAndTiming data={data} />
      <StagesSection stages={data.stages} />
      <AiCallsSection calls={data.ai_calls} />
    </>
  );
}

/** Source and timings — the two questions asked first about a failed job. */
function OwnerAndTiming({ data }: { data: JobInvestigation }) {
  const { t } = useTranslation();
  const { owner, timing, correlation_id: correlationId } = data;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-sm font-headline font-bold text-text-strong">
          <Building2 aria-hidden="true" className="h-4 w-4" />
          {t("admin.processing_job.investigation.source")}
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Row label={t("admin.processing_job.investigation.organization")}>
            {owner.organization_name ?? (
              <Unknown
                label={t("admin.processing_job.investigation.unknown")}
              />
            )}
          </Row>
          <Row label={t("admin.processing_job.investigation.course")}>
            {owner.course_id && owner.course_title ? (
              // Straight through to the course, so the operator never has to
              // paste an id into another screen to see what broke.
              <Link
                to="/admin/courses/$courseId"
                params={{ courseId: owner.course_id }}
                className="inline-flex items-center gap-1 font-medium text-m3-primary hover:underline"
              >
                {owner.course_title}
                <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <Unknown
                label={t("admin.processing_job.investigation.unknown")}
              />
            )}
          </Row>
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-sm font-headline font-bold text-text-strong">
          <Clock aria-hidden="true" className="h-4 w-4" />
          {t("admin.processing_job.investigation.timing")}
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Row label={t("admin.processing_job.investigation.queue_wait")}>
            <Duration seconds={timing.queue_wait_seconds} />
          </Row>
          <Row label={t("admin.processing_job.investigation.duration")}>
            <span className="flex items-center gap-2">
              <Duration seconds={timing.duration_seconds} />
              {timing.is_running && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                  {t("admin.processing_job.investigation.still_running")}
                </span>
              )}
            </span>
          </Row>
          <Row label={t("admin.processing_job.investigation.correlation")}>
            <CorrelationId value={correlationId} />
          </Row>
        </dl>
      </section>
    </div>
  );
}

/**
 * The correlation id, with the two things an operator does with it: copy it,
 * and open the request log filtered to it. Null is rendered as an explanation
 * rather than a blank — plenty of work is enqueued by no request at all, and
 * an empty field reads as a bug.
 */
function CorrelationId({ value }: { value: string | null }) {
  const { t } = useTranslation();
  if (!value) {
    return (
      <span className="text-xs text-text-muted">
        {t("admin.processing_job.investigation.no_correlation")}
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs">
        {value}
      </code>
      <Button
        variant="ghost"
        className="h-auto p-1"
        title={t("admin.processing_job.investigation.copy")}
        onClick={() => {
          void navigator.clipboard
            .writeText(value)
            .then(() =>
              toast.success(t("admin.processing_job.investigation.copied")),
            )
            .catch(() => {
              /* clipboard blocked — the id is visible and selectable anyway */
            });
        }}
      >
        <Copy aria-hidden="true" className="h-3.5 w-3.5" />
      </Button>
      <Link
        to="/admin/audit-logs"
        search={{ tab: "http" }}
        className="text-xs font-semibold text-m3-primary hover:underline"
      >
        {t("admin.processing_job.investigation.open_requests")}
      </Link>
    </span>
  );
}

/** Per-stage AI usage: where the pipeline spent its time and money. */
function StagesSection({ stages }: { stages: JobStage[] }) {
  const { t } = useTranslation();
  if (stages.length === 0) return null;

  const columns: DataTableColumn<JobStage>[] = [
    {
      id: "stage",
      header: t("admin.processing_job.investigation.stage"),
      cell: (r) => <span className="font-medium">{r.stage}</span>,
    },
    {
      id: "calls",
      header: t("admin.processing_job.investigation.calls"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums">
          {r.failed_count > 0 ? (
            <span className="text-red-700">
              {r.failed_count} / {r.call_count}
            </span>
          ) : (
            r.call_count
          )}
        </span>
      ),
    },
    {
      id: "tokens",
      header: t("admin.processing_job.investigation.tokens"),
      align: "right",
      cell: (r) => <span className="tabular-nums">{r.tokens}</span>,
    },
    {
      id: "spend",
      header: t("admin.processing_job.investigation.spend"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums">${r.spend_usd.toFixed(4)}</span>
      ),
    },
    {
      id: "latency",
      header: t("admin.processing_job.investigation.max_latency"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {/* Null means no call in the stage recorded a latency, which is not
              the same as a zero-latency stage. */}
          {r.max_latency_ms === null
            ? t("admin.dashboard.no_data")
            : `${r.max_latency_ms}ms`}
        </span>
      ),
    },
  ];

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-headline font-bold text-text-strong">
        {t("admin.processing_job.investigation.stages")}
      </h2>
      <DataTable columns={columns} data={stages} getRowId={(r) => r.stage} />
    </section>
  );
}

/** The individual calls, so a failure names the model and the message. */
function AiCallsSection({ calls }: { calls: JobAiCall[] }) {
  const { t } = useTranslation();
  const formatDate = useFormatDateTimeMedium();

  if (calls.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-headline font-bold text-text-strong">
          {t("admin.processing_job.investigation.ai_calls")}
        </h2>
        <p className="rounded-lg border border-border bg-card px-5 py-4 text-sm text-text-muted">
          {t("admin.processing_job.investigation.no_ai_calls")}
        </p>
      </section>
    );
  }

  const columns: DataTableColumn<JobAiCall>[] = [
    {
      id: "called_at",
      header: t("admin.processing_job.investigation.when"),
      cell: (r) => (
        <span className="text-text-muted">{formatDate(r.called_at)}</span>
      ),
    },
    {
      id: "stage",
      header: t("admin.processing_job.investigation.stage"),
      cell: (r) => r.stage_name ?? r.role ?? "—",
    },
    {
      id: "model",
      header: t("admin.processing_job.investigation.model"),
      cell: (r) => <span className="font-mono text-xs">{r.model_name}</span>,
    },
    {
      id: "status",
      header: t("admin.processing_job.investigation.status"),
      cell: (r) => (
        <span
          className={cn(
            "font-medium",
            r.status === "failed" ? "text-red-700" : "text-emerald-700",
          )}
        >
          {r.status}
        </span>
      ),
    },
    {
      id: "latency",
      header: t("admin.processing_job.investigation.latency"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {r.latency_ms === null
            ? t("admin.dashboard.no_data")
            : `${r.latency_ms}ms`}
        </span>
      ),
    },
    {
      id: "error",
      header: t("admin.processing_job.investigation.error"),
      cell: (r) =>
        r.error_message ? (
          <span className="block max-w-md truncate text-xs text-red-700">
            {r.error_message}
          </span>
        ) : (
          <span className="text-text-subtle">—</span>
        ),
    },
  ];

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-headline font-bold text-text-strong">
        {t("admin.processing_job.investigation.ai_calls")}
      </h2>
      <DataTable columns={columns} data={calls} getRowId={(r) => r.id} />
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-right text-text-strong">{children}</dd>
    </div>
  );
}

function Unknown({ label }: { label: string }) {
  return <span className="text-text-muted italic">{label}</span>;
}

/** Null renders as "not started", never as 0s. */
function Duration({ seconds }: { seconds: number | null }) {
  const { t } = useTranslation();
  if (seconds === null) {
    return (
      <span className="text-text-muted">
        {t("admin.processing_job.investigation.not_started")}
      </span>
    );
  }
  return <span className="tabular-nums">{formatElapsedLabel(seconds)}</span>;
}
