import { PermissionDenied } from "@/components/ui/permission-denied";
import { ProcessingJobsSection } from "./_components/processing/ProcessingJobsSection";
import { JobsTabs } from "./_components/processing/JobsTabs";
import { useAdminProcessing } from "./_components/processing/use-admin-processing";

export default function AdminProcessingPage() {
  const c = useAdminProcessing();
  const { t } = c;

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
    <div className="space-y-4 pb-12">
      <div>
        <h1 className="text-2xl font-headline font-bold text-text-strong">
          {t("admin.processing.title")}
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {t("admin.processing.subtitle")}
        </p>
      </div>

      {/* The six counter cards and the separate "Filter status" pill row are
          gone: they showed and then re-listed the same six numbers. The counts
          now ride on the tabs that filter by them (derived from the same
          range-filtered list the table renders, so they can't disagree). */}
      <JobsTabs c={c} />

      <ProcessingJobsSection c={c} />
    </div>
  );
}
