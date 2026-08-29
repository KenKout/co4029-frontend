import { JobsTabs } from "../processing/JobsTabs";
import { ProcessingJobsSection } from "../processing/ProcessingJobsSection";
import type { AdminProcessingController } from "../processing/use-admin-processing";

/**
 * Jobs & Queues tab — the former `/admin/processing` page, unchanged.
 *
 * The status tabs and the table are reused verbatim rather than reimplemented:
 * they already read their counts from the summary endpoint over the same
 * window as the list, which is the property that keeps the badges and the rows
 * agreeing.
 */
export function JobsQueuesTab({ c }: { c: AdminProcessingController }) {
  return (
    <div className="space-y-4">
      <JobsTabs c={c} />
      <ProcessingJobsSection c={c} />
    </div>
  );
}
