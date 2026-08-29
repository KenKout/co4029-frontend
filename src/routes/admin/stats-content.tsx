import { Link } from "@tanstack/react-router";
import { BookOpen, ChevronRight, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useContentStats } from "@/lib/api/hooks/admin";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { useFormatCount } from "@/lib/format/number";
import { BreakdownRingCard } from "./_components/stats/BreakdownRingCard";
import { MiniStat } from "./_components/stats/MiniStat";
import {
  MATERIAL_RING_PALETTE,
  readBucket,
  type BreakdownBucket,
} from "./_components/stats/breakdown";

/**
 * Content inventory.
 *
 * Processing jobs used to have a third column here, counted all-time and over
 * `processing_jobs` alone, while the dashboard counted a 7-day window and the
 * processing page counted a union with `generation_runs`. Three surfaces, three
 * answers to "how many jobs failed". Jobs now live only in the Operations
 * surface, which this page links to instead (PRD ADM-004 and the section 2 IA
 * rule).
 */

function bucketSum(buckets: BreakdownBucket[] | undefined): number {
  let sum = 0;
  for (const bucket of buckets ?? []) {
    const { count } = readBucket(bucket);
    if (typeof count === "number") sum += count;
  }
  return sum;
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
        <PageSkeleton
          rows={4}
          height="h-24"
          bg="bg-surface-muted"
          gap="space-y-4"
        />
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

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
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
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
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
          palette={MATERIAL_RING_PALETTE}
        />
      </div>

      <Link
        to="/admin/processing"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-m3-primary hover:underline"
      >
        {t("admin.stats.content.jobs_moved")}
        <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
      </Link>
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
