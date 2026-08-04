import { PageSkeleton } from "@/components/ui/page-skeleton";

import { JobsTable } from "./JobsTable";
import type { AdminProcessingController } from "./use-admin-processing";

function JobsBody({ c }: { c: AdminProcessingController }) {
  const {
    t,
    jobs,
    sortedJobs,
    retryingId,
    handleRetry,
    timeRange,
    setTimeRange,
    searchText,
    setSearchText,
  } = c;

  if (jobs.isError) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-5">
        <p className="text-sm text-danger">
          {t("admin.processing.jobs_load_failed")}
        </p>
      </div>
    );
  }

  if (jobs.isLoading) {
    return (
      <PageSkeleton
        rows={4}
        height="h-12"
        rounded="rounded-lg"
        bg="bg-surface-muted"
        gap="space-y-2"
      />
    );
  }

  return (
    <JobsTable
      jobs={sortedJobs}
      onRetry={handleRetry}
      retryingId={retryingId}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      search={searchText}
      onSearchChange={setSearchText}
    />
  );
}

export function ProcessingJobsSection({ c }: { c: AdminProcessingController }) {
  return <JobsBody c={c} />;
}
