import {
  BookOpen,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatCard } from "@/components/ui/stat-card";
import { useAdminStatsOverview } from "@/lib/api/hooks/admin";

function useFormatCount() {
  const { i18n } = useTranslation();
  const locale =
    (i18n.resolvedLanguage ?? i18n.language ?? "en") === "vi"
      ? "vi-VN"
      : "en-US";
  return (n: number | undefined): string => {
    if (n === undefined || n === null) return "—";
    return new Intl.NumberFormat(locale).format(n);
  };
}

export default function AdminStatsPage() {
  const { t } = useTranslation();
  const formatCount = useFormatCount();
  const { data, isLoading, isError } = useAdminStatsOverview();

  const isEmpty =
    !isLoading &&
    !isError &&
    data !== undefined &&
    data.total_users === 0 &&
    data.total_courses === 0 &&
    data.total_enrollments === 0 &&
    data.total_materials === 0 &&
    data.total_quiz_attempts === 0;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-headline font-bold text-text-strong">
          {t("admin.stats.title_overview")}
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {t("admin.stats.subtitle_overview")}
        </p>
      </div>

      {isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">{t("admin.stats.load_failed")}</p>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-24 bg-surface-muted animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="bg-surface-elev border border-border rounded-lg p-10 text-center">
          <BookOpen className="h-10 w-10 mx-auto mb-3 text-text-subtle" />
          <p className="text-sm font-medium text-text-strong">
            {t("admin.stats.empty_in_scope")}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {t("admin.stats.empty_body")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard
            label={t("admin.stats.labels.users")}
            value={formatCount(data?.total_users)}
            icon={Users}
          />
          <StatCard
            label={t("admin.stats.labels.courses")}
            value={formatCount(data?.total_courses)}
            icon={BookOpen}
          />
          <StatCard
            label={t("admin.stats.labels.enrollments")}
            value={formatCount(data?.total_enrollments)}
            icon={GraduationCap}
          />
          <StatCard
            label={t("admin.stats.labels.materials")}
            value={formatCount(data?.total_materials)}
            icon={FileText}
          />
          <StatCard
            label={t("admin.stats.labels.quiz_attempts")}
            value={formatCount(data?.total_quiz_attempts)}
            icon={ClipboardCheck}
          />
        </div>
      )}
    </div>
  );
}
