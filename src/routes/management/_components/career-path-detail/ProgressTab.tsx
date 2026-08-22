import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { useTeacherCareerPathProgress } from "@/lib/api/hooks/career-paths";
import { EmptyState } from "./EmptyState";
import { LoadErrorBox } from "./LoadErrorBox";
import { ProgressRow } from "./ProgressRow";

/** Progress tab: read-only completion table for the enrolled roster. */
export function ProgressTab({ id }: { id: string }) {
  const { t } = useTranslation();
  const progress = useTeacherCareerPathProgress(id);

  if (progress.isLoading) {
    return (
      <PageSkeleton
        rows={3}
        height="h-14"
        rounded="rounded-lg"
        gap="space-y-2"
      />
    );
  }

  if (progress.isError) {
    return (
      <LoadErrorBox
        message={t(
          "management_career_path_detail.errors.load_student_progress_failed",
        )}
      />
    );
  }

  const rows = progress.data ?? [];

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Users}
        text={t(
          "management_career_path_detail.empty_states.no_student_path_progress",
        )}
      />
    );
  }

  return (
    <div className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 overflow-hidden">
      <div className="hidden sm:grid grid-cols-[1fr_140px_180px] gap-4 px-5 py-3 border-b border-m3-outline-variant/10 text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant">
        <span>{t("management_career_path_detail.columns.student")}</span>
        <span>
          {t("management_career_path_detail.columns.completed_courses")}
        </span>
        <span>{t("management_career_path_detail.columns.total_progress")}</span>
      </div>
      <div className="divide-y divide-m3-outline-variant/10">
        {rows.map((row) => (
          <ProgressRow key={row.student_id} row={row} />
        ))}
      </div>
    </div>
  );
}
