import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";

import { JobDetailBody } from "./_components/processing-job/JobDetailBody";
import { useAdminProcessingJob } from "./_components/processing-job/use-admin-processing-job";

export default function AdminProcessingJobPage() {
  const c = useAdminProcessingJob();
  const { t, data } = c;

  if (c.permissionsLoading || !c.canAdmin) {
    return (
      <div className="space-y-3 pb-12">
        <div className="h-6 w-40 bg-surface-muted animate-pulse rounded" />
        <div className="h-32 bg-surface-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: t("sections.admin"), to: "/admin/stats" },
          { label: t("admin.processing.title"), to: "/admin/processing" },
          { label: data?.job_type ?? t("admin.processing_job.title") },
        ]}
      />
      <Link
        to="/admin/processing"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-strong"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("admin.processing_job.back_to_queue")}
      </Link>

      <JobDetailBody c={c} />
    </div>
  );
}
