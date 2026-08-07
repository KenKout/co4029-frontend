import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, FilePlus, Layers, Plus, X } from "lucide-react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { CourseInPathRow } from "./CourseInPathRow";
import { CoursePickerDialog } from "./CoursePickerDialog";
import { EmptyState } from "./EmptyState";
import { ReorderBanner } from "./ReorderBanner";
import { SectionActionCard } from "./SectionActionCard";
import { StageCard } from "./StageCard";
import { useCoursesTab } from "./use-courses-tab";
import { useStagesTab } from "./use-stages-tab";

/**
 * Courses tab: stages, and the courses attached to each stage.
 *
 * Courses live inside stages now (backend migration 0070), so adding a course
 * always names a target stage and reordering is scoped to one stage.
 */
export function CoursesTab({ id }: { id: string }) {
  const { t } = useTranslation();
  const controller = useCoursesTab(id, t);
  const stages = useStagesTab(id, t);
  const prefix = "management_career_path_detail.stages";

  if (controller.list.isLoading || stages.list.isLoading) {
    return (
      <PageSkeleton
        rows={2}
        height="h-14"
        rounded="rounded-lg"
        gap="space-y-2"
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionActionCard
        title={t(`${prefix}.title`)}
        hint={t(`${prefix}.hint`)}
        icon={Plus}
        actionLabel={t(`${prefix}.add`)}
        onAction={stages.handleCreate}
      />

      {/* Reorder warnings: the backend deliberately does NOT rewrite a
          manager's unlock policy, so what changed has to be said out loud. */}
      {stages.warnings.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-900">
                {t(`${prefix}.warnings.title`)}
              </p>
              <ul className="mt-1 space-y-1">
                {stages.warnings.map((w) => (
                  <li key={`${w.stage_id}-${w.code}`} className="text-xs text-amber-800">
                    {t(`${prefix}.warnings.${w.code}`, { defaultValue: w.message })}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={stages.dismissWarnings}
              aria-label={t("common.close")}
              className="p-1 rounded hover:bg-amber-100 cursor-pointer"
            >
              <X className="h-3.5 w-3.5 text-amber-700" />
            </button>
          </div>
        </div>
      )}

      {stages.hasReorderChanges && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-m3-surface-container">
          <span className="text-xs text-m3-on-surface-variant">
            {t(`${prefix}.save_order`)}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => stages.setOrder(null)}
              className="h-8 px-3 rounded-full text-xs font-semibold text-m3-on-surface-variant hover:bg-m3-surface-container-high cursor-pointer"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={stages.handleSubmitReorder}
              disabled={stages.reorder.isPending}
              className="h-8 px-3 rounded-full bg-m3-primary text-m3-on-primary text-xs font-semibold disabled:opacity-50 cursor-pointer"
            >
              {t(`${prefix}.save_order`)}
            </button>
          </div>
        </div>
      )}

      {controller.hasReorderChanges && <ReorderBanner controller={controller} />}

      {controller.pickerOpen && <CoursePickerDialog controller={controller} />}

      {stages.rows.length === 0 ? (
        <EmptyState icon={Layers} text={t(`${prefix}.empty`)} />
      ) : (
        <div className="space-y-4">
          {stages.rows.map((stage, stageIdx) => {
            const courses = controller.rowsByStage.get(stage.id) ?? [];
            return (
              <div key={stage.id} className="space-y-2">
                <StageCard
                  stage={stage}
                  index={stageIdx}
                  total={stages.rows.length}
                  courses={courses}
                  controller={stages}
                >
                  {courses.map((row, idx) => (
                    <CourseInPathRow
                      key={row.course_id}
                      row={row}
                      index={idx}
                      stageTotal={courses.length}
                      pathId={id}
                      controller={controller}
                      stages={stages.rows}
                      stagesController={stages}
                    />
                  ))}
                </StageCard>
                <div className="ml-4 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => controller.openPickerForStage(stage.id)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold text-m3-primary hover:bg-m3-primary-fixed cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t("management_career_path_detail.actions.add_courses")}
                  </button>
                  {/* Create-and-attach in one step. The picker only offers
                      courses that already exist, so without this the manager
                      leaves the path, creates a course, and has to remember to
                      come back and attach it — the omission the readiness
                      checklist reports as "not on any career path". */}
                  <Link
                    to="/management/courses/new"
                    search={{ pathId: id, stageId: stage.id }}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold text-m3-on-surface-variant hover:bg-m3-surface-container cursor-pointer"
                  >
                    <FilePlus className="h-3.5 w-3.5" />
                    {t("management_career_path_detail.actions.new_course")}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
