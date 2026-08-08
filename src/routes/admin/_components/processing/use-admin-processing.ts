import { useMemo, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { useProcessingJobs, useProcessingSummary, useRetryProcessingJob } from "@/lib/api/hooks/admin";
import {
  usePermissions,
  useRequirePermission,
} from "@/lib/auth/use-permissions";
import { ApiError } from "@/lib/api/client";
import type { ProcessingJobOut } from "@/lib/api/types";
import type {
  CustomTimeRange,
  TimeRange,
} from "@/components/ui/data-table-toolbar";

/**
 * Translate a toolbar time range into the backend's required `since` bound.
 * `all` uses the epoch so nothing is filtered out. A `custom` range is
 * resolved by the hook (it needs the picked dates), not here.
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
    case "custom":
    case "all":
      return "1970-01-01T00:00:00.000Z";
  }
}

/** Resolve a custom from/to pair (``YYYY-MM-DD``) into ISO instants. The
 *  ``to`` day is inclusive — it becomes ``to + 1 day`` at UTC midnight. */
export function boundsFromCustom(
  range: CustomTimeRange | undefined,
): { since: string; until?: string } {
  if (!range?.from) {
    return { since: "1970-01-01T00:00:00.000Z" };
  }
  const since = new Date(`${range.from}T00:00:00.000Z`).toISOString();
  if (!range.to) return { since };
  const until = new Date(`${range.to}T00:00:00.000Z`);
  until.setUTCDate(until.getUTCDate() + 1);
  return { since, until: until.toISOString() };
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
 * Tab counts come from a dedicated SUMMARY endpoint over the same `since`
 * window as the jobs list — NOT from the jobs query itself, which is
 * status-filtered: deriving badges from the filtered list collapsed every
 * other tab's count to zero the moment one status was selected (bug report
 * 2026-08-04). The endpoint also stays exact when a window holds more rows
 * than the list's 500-row cap.
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
  // Picked from/to dates when `timeRange === "custom"`.
  const [customRange, setCustomRange] = useState<CustomTimeRange | undefined>(
    undefined,
  );
  const [searchText, setSearchText] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useRequirePermission(canAdmin, {
    messageKey: "common.no_permission",
  });

  // CRITICAL: `since` MUST be stable between renders. It feeds the react-query
  // key, and sinceFromRange() returns a fresh ISO string every call — an
  // un-memoized value made the key change on every render, so each poll
  // resolution re-rendered the page, which minted a new key, which refetched…
  // an infinite API spam loop (bug report 2026-08-04). Memoizing on the range
  // makes the key stable until the user actually changes the range.
  const since = useMemo(() => {
    if (timeRange === "custom") return boundsFromCustom(customRange).since;
    return sinceFromRange(timeRange);
  }, [timeRange, customRange]);
  const until = useMemo(() => {
    if (timeRange === "custom") return boundsFromCustom(customRange).until;
    return undefined;
  }, [timeRange, customRange]);
  const jobs = useProcessingJobs({
    status: statusFilter || undefined,
    since,
    until,
  });
  const summary = useProcessingSummary(since, until);
  const retry = useRetryProcessingJob();

  /** Per-status counts over the range window (see docstring) — from the
   *  summary endpoint, so they never collapse under the status filter. */
  const counts = useMemo<ProcessingCounts | undefined>(
    () => summary.data,
    [summary.data],
  );

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
            err.message || t("admin.processing.toasts.retry_failed"),
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
    customRange,
    setCustomRange,
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
