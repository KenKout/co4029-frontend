import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { LoadErrorBox } from "./LoadErrorBox";
import { RosterRow } from "./RosterRow";
import { useRosterTab } from "./use-roster-tab";

/** Roster tab: who is enrolled in this course, and dropping them one by one. */
export function RosterTab({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const controller = useRosterTab(courseId, t);
  const { rows } = controller;

  if (controller.isLoading) {
    return (
      <PageSkeleton
        rows={3}
        height="h-14"
        rounded="rounded-lg"
        gap="space-y-2"
      />
    );
  }

  if (controller.isError) {
    return (
      <LoadErrorBox
        message={t("management_course_enrollments.errors.roster_load_failed")}
      />
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-m3-on-surface-variant">
        <Users className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">
          {t("management_course_enrollments.roster.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 overflow-hidden">
      <div className="hidden sm:grid grid-cols-[1fr_140px_140px_120px_100px] gap-4 px-5 py-3 border-b border-m3-outline-variant/10 text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant">
        <span>{t("management_course_enrollments.roster.col_student")}</span>
        <span>{t("management_course_enrollments.roster.col_status")}</span>
        <span>{t("management_course_enrollments.roster.col_source")}</span>
        <span>{t("management_course_enrollments.roster.col_enrolled_at")}</span>
        <span className="text-right">
          {t("management_course_enrollments.roster.col_actions")}
        </span>
      </div>
      <div className="divide-y divide-m3-outline-variant/10">
        {rows.map((row) => (
          <RosterRow key={row.id} row={row} controller={controller} />
        ))}
      </div>
    </div>
  );
}
