import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PermissionDenied } from "@/components/ui/permission-denied";

import { JobDetailBody } from "./_components/processing-job/JobDetailBody";
import { useAdminProcessingJob } from "./_components/processing-job/use-admin-processing-job";

export default function AdminProcessingJobPage() {
  const c = useAdminProcessingJob();
  const { t, data } = c;

  if (c.permissionsLoading) {
    return (
      <div className="space-y-3 pb-12">
        <div className="h-6 w-40 bg-surface-muted animate-pulse rounded" />
        <div className="h-32 bg-surface-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!c.canAdmin) {
    return <PermissionDenied />;
  }

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: t("admin.operations.title"), to: "/admin/operations" },
          { label: data?.job_type ?? t("admin.processing_job.title") },
        ]}
      />
      <JobDetailBody c={c} />
    </div>
  );
}
