import { useMemo, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

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
import type { ProcessingJobOut } from "@/lib/api/types";

/**
 * Permission gate, the status filter, the two polled queries and the retry
 * mutation.
 *
 * Hook call order and every query argument are identical to the original
 * component body: translation → permissions → route search → statusFilter
 * state → retryingId state → permission requirement → queue query → jobs query
 * (same `statusFilter ? { status: statusFilter } : undefined` argument, so both
 * polls keep their original cadence and enablement) → retry mutation → the
 * sorted-jobs memo.
 */
export function useAdminProcessing() {
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
    locale,
    permissionsLoading: permissions.isLoading,
    canAdmin,
    statusFilter,
    setStatusFilter,
    retryingId,
    queue,
    jobs,
    sortedJobs,
    handleRetry,
  };
}

export type AdminProcessingController = ReturnType<typeof useAdminProcessing>;
