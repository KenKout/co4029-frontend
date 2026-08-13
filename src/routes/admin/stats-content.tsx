import { AlertTriangle, BookOpen, FileText, Workflow } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useContentStats } from "@/lib/api/hooks/admin";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { useFormatCount } from "@/lib/format/number";
import { BreakdownRingCard } from "./_components/stats/BreakdownRingCard";
import { MiniStat } from "./_components/stats/MiniStat";
import { readBucket, type BreakdownBucket } from "./_components/stats/breakdown";

function bucketSum(buckets: BreakdownBucket[] | undefined): number {
  let sum = 0;
  for (const bucket of buckets ?? []) {
    const { count } = readBucket(bucket);
    if (typeof count === "number") sum += count;
  }
  return sum;
}

function bucketCount(
  buckets: BreakdownBucket[] | undefined,
  label: string,
): number {
  for (const bucket of buckets ?? []) {
    const { label: l, count } = readBucket(bucket);
    if (l === label && typeof count === "number") return count;
  }
  return 0;
}

export default function AdminStatsContentPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useContentStats();

  if (isError) {
    return (
      <div className="space-y-6 pb-12">
        <Heading />
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">{t("admin.stats.load_failed")}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <Heading />
        <PageSkeleton rows={4} height="h-24" bg="bg-surface-muted" gap="space-y-4" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <Heading />
      {data && <ContentStatsView data={data} />}
    </div>
  );
}

function ContentStatsView({
  data,
}: {
  data: NonNullable<ReturnType<typeof useContentStats>["data"]>;
}) {
  const { t } = useTranslation();
  const formatCount = useFormatCount();

  const coursesTotal = bucketSum(data.courses_by_status);
  const materialsTotal = bucketSum(data.materials_by_type);
  const jobsTotal = bucketSum(data.processing_jobs_by_status);
  const failedJobs = bucketCount(data.processing_jobs_by_status, "failed");
  const failedPct =
    jobsTotal > 0 ? Math.round((failedJobs / jobsTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat
          label={t("admin.stats.content.stat_courses")}
          value={formatCount(coursesTotal)}
          detail={t("admin.stats.content.delta_week", {
            n: formatCount(data.courses_created_7d ?? 0),
          })}
          icon={BookOpen}
        />
        <MiniStat
          label={t("admin.stats.content.stat_materials")}
          value={formatCount(materialsTotal)}
          detail={t("admin.stats.content.delta_week", {
            n: formatCount(data.materials_created_7d ?? 0),
          })}
          icon={FileText}
        />
        <MiniStat
          label={t("admin.stats.content.stat_jobs")}
          value={formatCount(jobsTotal)}
          detail={t("admin.stats.content.delta_today", {
            n: formatCount(data.processing_jobs_created_today ?? 0),
          })}
          icon={Workflow}
        />
        <MiniStat
          label={t("admin.stats.content.stat_failed")}
          value={formatCount(failedJobs)}
          detail={t("admin.stats.content.failed_rate", { pct: failedPct })}
          icon={AlertTriangle}
          tone="warn"
        />
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <BreakdownRingCard
          title={t("admin.stats.content.courses_by_status")}
          icon={BookOpen}
          buckets={data.courses_by_status}
          stacked
        />
        <BreakdownRingCard
          title={t("admin.stats.content.materials_by_type")}
          icon={FileText}
          buckets={data.materials_by_type}
          showTypeIcons
          stacked
        />
        <BreakdownRingCard
          title={t("admin.stats.content.processing_jobs_by_status")}
          icon={Workflow}
          buckets={data.processing_jobs_by_status}
          stacked
        />
      </div>
    </div>
  );
}

function Heading() {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-2xl font-headline font-bold text-text-strong">
        {t("admin.stats.title_content")}
      </h1>
      <p className="text-sm text-text-muted mt-1">
        {t("admin.stats.subtitle_content")}
      </p>
    </div>
  );
}
