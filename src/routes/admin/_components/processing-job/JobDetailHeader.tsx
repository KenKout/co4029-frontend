import { RefreshCw } from "lucide-react";

import { JobStatusBadgeMd as JobStatusBadge } from "@/components/ui/status-badges";
import { Button } from "@/components/ui/button";

import type {
  ProcessingJobController,
  ProcessingJobData,
} from "./use-admin-processing-job";

/** Job type, status badge, id and the retry action (failed jobs only). */
export function JobDetailHeader({
  c,
  data,
}: {
  c: ProcessingJobController;
  data: ProcessingJobData;
}) {
  const { t, isFailed, retry, handleRetry } = c;
  return (
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
          <Button variant="ghost"
            type="button"
            onClick={handleRetry}
            disabled={retry.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-m3-primary text-white hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {retry.isPending
              ? t("admin.users.actions.disabling")
              : t("admin.processing.retry")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
