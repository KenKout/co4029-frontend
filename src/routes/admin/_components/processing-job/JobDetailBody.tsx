import { Skeleton } from "@/components/ui/skeleton";

import { JobDetailHeader } from "./JobDetailHeader";
import { JobFieldsCard } from "./JobFieldsCard";
import { JobInvestigationSections } from "./JobInvestigationSections";
import type { ProcessingJobController } from "./use-admin-processing-job";

/** Error / loading / loaded switch for the job-detail body. */
export function JobDetailBody({ c }: { c: ProcessingJobController }) {
  const { t, job, data, investigation } = c;

  if (job.isError) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-5">
        <p className="text-sm text-danger">
          {t("admin.processing_job.load_failed")}
        </p>
      </div>
    );
  }

  if (job.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      <JobDetailHeader c={c} data={data} />

      <JobFieldsCard c={c} data={data} />

      <JobInvestigationSections
        data={investigation.data}
        isLoading={investigation.isLoading}
        isError={investigation.isError}
      />

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
  );
}
