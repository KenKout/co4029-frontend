import { useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { useProcessingJob, useRetryProcessingJob } from "@/lib/api/hooks/admin";
import { useJobInvestigation } from "@/lib/api/hooks/admin-jobs";
import { usePermissions } from "@/lib/auth/use-permissions";
import { ApiError } from "@/lib/api/client";
import { useFormatDateTimeMedium } from "@/lib/format/date";

/**
 * Permission gate, the polled job query and the retry mutation.
 *
 * Hook call order and every query argument are identical to the original
 * component body: translation → date formatter → route params → permissions →
 * permission requirement → job query (still keyed on the same
 * `enabled ? jobId : ""` argument, so polling and its terminal-state stop are
 * untouched) → retry mutation.
 *
 * Dates use the MEDIUM preset ("Aug 4, 2026, 09:31 AM") — the short form's
 * 2-digit year ("8/4/26") read as a bug on this detail page.
 */
export function useAdminProcessingJob() {
  const { t } = useTranslation();
  const formatDate = useFormatDateTimeMedium();
  const params = useParams({ strict: false }) as { jobId?: string };
  const jobId = params.jobId ?? "";

  const permissions = usePermissions();
  const canAdmin = permissions.has("system.administer");

  const enabled = !permissions.isLoading && canAdmin && Boolean(jobId);
  const job = useProcessingJob(enabled ? jobId : "");
  // Loaded alongside, not instead of: the plain detail is what the header and
  // the retry button need, and a failure of the heavier investigation query
  // must not take the page down with it (ADM-015).
  const investigation = useJobInvestigation(jobId, enabled);
  const retry = useRetryProcessingJob();

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

  return {
    t,
    formatDate,
    permissionsLoading: permissions.isLoading,
    canAdmin,
    job,
    retry,
    data,
    investigation,
    isFailed,
    handleRetry,
  };
}

export type ProcessingJobController = ReturnType<typeof useAdminProcessingJob>;

export type ProcessingJobData = NonNullable<ProcessingJobController["data"]>;
