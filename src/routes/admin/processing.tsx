import { ProcessingJobsSection } from "./_components/processing/ProcessingJobsSection";
import { QueueStatsSection } from "./_components/processing/QueueStatsSection";
import { StatusFilterBar } from "./_components/processing/StatusFilterBar";
import { useAdminProcessing } from "./_components/processing/use-admin-processing";

export default function AdminProcessingPage() {
  const c = useAdminProcessing();
  const { t } = c;

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
      <div>
        <h1 className="text-2xl font-headline font-bold text-text-strong">
          {t("admin.processing.title")}
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {t("admin.processing.subtitle")}
        </p>
      </div>

      <QueueStatsSection c={c} />

      <StatusFilterBar c={c} />

      <ProcessingJobsSection c={c} />
    </div>
  );
}
