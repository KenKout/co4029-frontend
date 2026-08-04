import { SectionHeader } from "@/components/ui/section-header";

import { AtRiskPanel } from "./_components/course-progress/AtRiskPanel";
import { ProgressSummaryTiles } from "./_components/course-progress/ProgressSummaryTiles";
import { RosterProgressTable } from "./_components/course-progress/RosterProgressTable";
import { useCourseProgressController } from "./_components/course-progress/use-course-progress-controller";

/**
 * Course Progress tab: cohort summary tiles, the at-risk panel and the full
 * roster progress table.
 *
 * Thin orchestrator: the queries and derived values live in
 * `useCourseProgressController`, every piece of the surface in
 * `_components/course-progress/`. `t` comes back from the controller so the
 * page keeps exactly the hook sequence it had before the split.
 */
export default function TeacherCourseProgressPage() {
  const controller = useCourseProgressController();
  const { t } = controller;

  return (
    <div className="min-h-screen pb-12">
      <div className="pt-2">
        <SectionHeader
          title={t("teacher_progress.title")}
          subtitle={t("teacher_progress.subtitle")}
        />
      </div>

      {/* ── 12-col grid: main content + sticky at-risk sidebar ── */}
      <div className="mt-6 grid grid-cols-12 gap-6">
        {/* ── Main 8 cols ── */}
        <div className="col-span-12 lg:col-span-8 space-y-6 min-w-0">
          {/* Summary tiles */}
          <ProgressSummaryTiles controller={controller} />

          {/* Roster table */}
          <RosterProgressTable controller={controller} />
        </div>

        {/* ── Sidebar 4 cols ── */}
        <div className="col-span-12 lg:col-span-4 space-y-6 lg:sticky lg:top-24 self-start">
          <AtRiskPanel controller={controller} />
        </div>
      </div>
    </div>
  );
}
