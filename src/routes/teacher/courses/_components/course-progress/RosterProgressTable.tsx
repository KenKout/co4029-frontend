import { useTranslation } from "react-i18next";
import { Activity, Users } from "lucide-react";

import { RosterProgressHeader } from "./RosterProgressHeader";
import { RosterProgressRow } from "./RosterProgressRow";
import type { CourseProgressController } from "./use-course-progress-controller";

/**
 * Roster progress table — section header, column header, then the skeleton, the
 * empty state or the sorted rows. Extracted verbatim from the former 401-line
 * course-progress.tsx, branch nesting included.
 */
export function RosterProgressTable({
  controller,
}: {
  controller: CourseProgressController;
}) {
  const { t } = useTranslation();
  const { rosterLoading, cohortLoading, sortedRows, courseId, atRiskById } =
    controller;
  return (
    <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial overflow-hidden">
      <div className="px-6 py-4 border-b border-m3-outline-variant/20">
        <h2 className="font-headline font-bold text-base text-m3-on-surface flex items-center gap-2">
          <Activity className="h-4 w-4 text-m3-secondary" />
          {t("teacher_progress.roster_title")}
        </h2>
        <p className="text-xs text-m3-on-surface-variant mt-0.5">
          {t("teacher_progress.roster_subtitle")}
        </p>
      </div>

      <RosterProgressHeader />

      {rosterLoading || cohortLoading ? (
        <div className="p-6 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-14 rounded-xl bg-m3-surface-container-low animate-pulse"
            />
          ))}
        </div>
      ) : !sortedRows.length ? (
        <div className="px-6 py-12 text-center">
          <Users className="h-8 w-8 text-m3-on-surface-variant opacity-40 mx-auto mb-2" />
          <p className="text-sm font-semibold text-m3-on-surface">
            {t("teacher_progress.empty_roster_title")}
          </p>
          <p className="text-xs text-m3-on-surface-variant mt-1">
            {t("teacher_progress.empty_roster_body")}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-m3-outline-variant/10">
          {sortedRows.map((row) => (
            <RosterProgressRow
              key={row.user_id}
              row={row}
              courseId={courseId}
              atRiskById={atRiskById}
            />
          ))}
        </div>
      )}
    </section>
  );
}
