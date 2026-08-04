import { useMemo, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { useProcessingJobs, useRetryProcessingJob } from "@/lib/api/hooks/admin";
import {
  usePermissions,
  useRequirePermission,
} from "@/lib/auth/use-permissions";
import { ApiError } from "@/lib/api/client";
import type { ProcessingJobOut } from "@/lib/api/types";
import type { TimeRange } from "@/components/ui/data-table-toolbar";

/**
 * Translate a toolbar time range into the backend's required `since` bound.
 * `all` uses the epoch so nothing is filtered out.
 */
export function sinceFromRange(range: TimeRange): string {
  const now = Date.now();
  switch (range) {
    case "today": {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    case "yesterday": {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    case "week":
      return new Date(now - 7 * 86_400_000).toISOString();
    case "month":
      return new Date(now - 30 * 86_400_000).toISOString();
    case "6months":
      return new Date(now - 180 * 86_400_000).toISOString();
    case "year":
      return new Date(now - 365 * 86_400_000).toISOString();
    case "all":
      return "1970-01-01T00:00:00.000Z";
  }
}

export interface ProcessingCounts {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}

/**
 * Permission gate, the status/time/search filters, the polled jobs query and
 * the retry mutation.
 *
 * Tab counts are derived from the SAME jobs list the table renders (bounded
 * only by the toolbar time range), so the badges can never disagree with the
 * rows — the old queue-depth endpoint counted every job ever while the table
 * silently fetched only the last 7 days.
 */
export function useAdminProcessing() {
  const { t } = useTranslation();
  const permissions = usePermissions();
  const canAdmin = permissions.has("system.administer");

  // Seed the filter from ?status= so the admin dashboard can deep-link straight
  // to the failed jobs ("Job failure rate" tile) instead of landing on the
  // unfiltered queue and making the operator re-select.
  const search = useSearch({ strict: false }) as { status?: string };
  const [statusFilter, setStatusFilter] = useState<string>(search.status ?? "");
  // Toolbar time range — defaults to the same 7-day window the page used to
  // apply silently, now visible and user-controllable.
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [searchText, setSearchText] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useRequirePermission(canAdmin, {
    messageKey: "common.no_permission",
  });

  const since = sinceFromRange(timeRange);
  const jobs = useProcessingJobs({
    status: statusFilter || undefined,
    since,
  });
  const retry = useRetryProcessingJob();

  /** Per-status counts over the range-filtered list (see docstring). */
  const counts = useMemo<ProcessingCounts | undefined>(() => {
    const list = jobs.data;
    if (!list) return undefined;
    const byStatus = (s: string) => list.filter((j) => j.status === s).length;
    return {
      total: list.length,
      pending: byStatus("pending"),
      running: byStatus("running"),
      completed: byStatus("completed"),
      failed: byStatus("failed"),
      cancelled: byStatus("cancelled"),
    };
  }, [jobs.data]);

  /** Range-filtered list, then search, then newest-updated first. */
  const sortedJobs = useMemo<ProcessingJobOut[]>(() => {
    const q = searchText.trim().toLowerCase();
    const list = (jobs.data ?? []).filter((job) => {
      if (!q) return true;
      return (
        job.job_type.toLowerCase().includes(q) ||
        job.entity_type.toLowerCase().includes(q) ||
        job.entity_id.toLowerCase().includes(q) ||
        job.status.toLowerCase().includes(q)
      );
    });
    return [...list].sort((a, b) =>
      a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0,
    );
  }, [jobs.data, searchText]);

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

  return {
    t,
    permissionsLoading: permissions.isLoading,
    canAdmin,
    statusFilter,
    setStatusFilter,
    timeRange,
    setTimeRange,
    searchText,
    setSearchText,
    counts,
    retryingId,
    jobs,
    sortedJobs,
    handleRetry,
  };
}

export type AdminProcessingController = ReturnType<typeof useAdminProcessing>;
