import { PageSkeleton } from "@/components/ui/page-skeleton";

import { JobsTable } from "./JobsTable";
import type { CourseDetailController } from "./use-admin-course-detail";

function JobsBody({ c }: { c: CourseDetailController }) {
  const { t, jobs } = c;

  if (jobs.isError) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-5">
        <p className="text-sm text-danger">
          {t("admin.course_detail.jobs_load_failed")}
        </p>
      </div>
    );
  }

  if (jobs.isLoading) {
    return (
      <PageSkeleton
        rows={3}
        height="h-12"
        rounded="rounded-lg"
        bg="bg-surface-muted"
        gap="space-y-2"
      />
    );
  }

  return <JobsTable jobs={jobs.data ?? []} />;
}

export function RecentJobsSection({ c }: { c: CourseDetailController }) {
  return (
    <div>
      <h2 className="text-lg font-headline font-bold text-text-strong mb-3">
        {c.t("admin.course_detail.recent_jobs")}
      </h2>
      <JobsBody c={c} />
    </div>
  );
}
