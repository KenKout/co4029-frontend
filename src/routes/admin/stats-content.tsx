import { BookOpen, FileText, Workflow } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useContentStats } from "@/lib/api/hooks/admin";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { BreakdownRingCard } from "./_components/stats/BreakdownRingCard";

export default function AdminStatsContentPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useContentStats();

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-headline font-bold text-text-strong">
          {t("admin.stats.title_content")}
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {t("admin.stats.subtitle_content")}
        </p>
      </div>

      {isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">{t("admin.stats.load_failed")}</p>
        </div>
      ) : isLoading ? (
        <PageSkeleton
          rows={3}
          height="h-32"
          bg="bg-surface-muted"
          gap="space-y-4"
        />
      ) : (
        <div className="space-y-4">
          <BreakdownRingCard
            title={t("admin.stats.content.courses_by_status")}
            icon={BookOpen}
            buckets={data?.courses_by_status}
          />
          <BreakdownRingCard
            title={t("admin.stats.content.materials_by_type")}
            icon={FileText}
            buckets={data?.materials_by_type}
            showTypeIcons
          />
          <BreakdownRingCard
            title={t("admin.stats.content.processing_jobs_by_status")}
            icon={Workflow}
            buckets={data?.processing_jobs_by_status}
          />
        </div>
      )}
    </div>
  );
}
