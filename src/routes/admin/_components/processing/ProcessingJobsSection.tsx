import { JobsTable } from "./JobsTable";
import type { AdminProcessingController } from "./use-admin-processing";

function JobsBody({ c }: { c: AdminProcessingController }) {
  const {
    jobs,
    sortedJobs,
    retryingId,
    handleRetry,
    timeRange,
    setTimeRange,
    customRange,
    setCustomRange,
    searchText,
    setSearchText,
  } = c;

  // The toolbar stays mounted across loads (JobsTable renders skeleton rows
  // below it) — unmounting the section on isLoading destroyed the
  // TimeRangeSelect's dialogOpen state mid-open (custom range on first pick).
  return (
    <JobsTable
      jobs={sortedJobs}
      onRetry={handleRetry}
      retryingId={retryingId}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      customRange={customRange}
      onCustomRangeChange={setCustomRange}
      search={searchText}
      onSearchChange={setSearchText}
      loading={jobs.isLoading}
      error={jobs.isError}
    />
  );
}

export function ProcessingJobsSection({ c }: { c: AdminProcessingController }) {
  return <JobsBody c={c} />;
}
