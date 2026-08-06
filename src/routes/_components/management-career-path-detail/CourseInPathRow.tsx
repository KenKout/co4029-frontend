import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Select } from "@/components/ui/select";
import { useRemoveCareerPathCourse } from "@/lib/api/hooks/career-paths";
import type {
  CareerPathCourseAuthoring,
  CareerPathStageAuthoring,
} from "@/lib/api/types";
import { RemoveRowButtons } from "./RemoveRowButtons";
import type { CoursesTabController } from "./use-courses-tab";
import type { StagesTabController } from "./use-stages-tab";

/**
 * One attached course inside its stage: reorder arrows (scoped to the stage,
 * since `(stage_id, position)` is what is unique now), position chip,
 * title/slug, the required-or-optional marker, the satisfied-by indicator, a
 * move-to-another-stage select and the remove control.
 */
export function CourseInPathRow({
  row,
  index,
  stageTotal,
  pathId,
  controller,
  stages,
  stagesController,
}: {
  row: CareerPathCourseAuthoring;
  /** Index WITHIN the stage, not the flat list. */
  index: number;
  /** Number of courses in this row's stage. */
  stageTotal: number;
  pathId: string;
  controller: CoursesTabController;
  stages: CareerPathStageAuthoring[];
  stagesController: StagesTabController;
}) {
  const { t } = useTranslation();
  const remove = useRemoveCareerPathCourse(pathId, row.course_id);
  const [confirming, setConfirming] = useState(false);
  const prefix = "management_career_path_detail.stages";

  function handleRemove() {
    remove.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("management_career_path_detail.toasts.course_removed"));
        setConfirming(false);
        controller.removeLocally(row.course_id);
      },
      onError: (err) =>
        toast.error(
          (err as Error).message ||
            t("management_career_path_detail.errors.remove_course_failed"),
        ),
    });
  }

  const requiredOrOptional = t(
    "management_career_path_detail.labels.required_or_optional",
  );

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-m3-surface-container-low ghost-border">
      <div className="flex flex-col gap-0.5 shrink-0">
        <button
          type="button"
          onClick={() => controller.moveInStage(row.stage_id, index, -1)}
          disabled={index === 0}
          className="p-1 rounded hover:bg-m3-surface-container disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          title={t("management_career_path_detail.actions.move_up")}
        >
          <ArrowUp className="h-3 w-3 text-m3-on-surface-variant" />
        </button>
        <button
          type="button"
          onClick={() => controller.moveInStage(row.stage_id, index, 1)}
          disabled={index === stageTotal - 1}
          className="p-1 rounded hover:bg-m3-surface-container disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          title={t("management_career_path_detail.actions.move_down")}
        >
          <ArrowDown className="h-3 w-3 text-m3-on-surface-variant" />
        </button>
      </div>
      <div className="flex flex-col items-center justify-center w-8 h-8 rounded-lg bg-m3-primary-fixed text-m3-primary shrink-0 font-headline font-bold text-xs">
        {row.position}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-m3-on-surface truncate">
          {row.course_title}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          <span className="text-[11px] font-mono text-m3-on-surface-variant truncate">
            {row.course_slug}
          </span>
          <span
            className={
              row.is_required
                ? "text-[10px] font-bold uppercase text-m3-primary"
                : "text-[10px] font-bold uppercase text-m3-on-surface-variant"
            }
          >
            {requiredOrOptional.split(" / ")[row.is_required ? 0 : 1] ??
              requiredOrOptional}
          </span>
          {/* Satisfied-by is display-only: the backend accepts 'pass' in the
              CHECK for a future graded variant, but only 'completion' has an
              evaluator today. */}
          <span className="text-[10px] text-m3-on-surface-variant">
            {t(`${prefix}.fields.satisfied_by`)}:{" "}
            {t(`${prefix}.satisfied_by.${row.satisfied_by}`)}
          </span>
        </div>
      </div>
      {stages.length > 1 && (
        <div className="shrink-0 w-40 hidden sm:block">
          <Select<string>
            value={row.stage_id}
            onValueChange={(next) => {
              if (next !== row.stage_id) {
                stagesController.handleMoveCourse(row.course_id, next);
              }
            }}
            size="sm"
            options={stages.map((s) => ({
              value: s.id,
              label: stagesController.stageLabel(s),
            }))}
            aria-label={t(`${prefix}.move_to_stage`)}
          />
        </div>
      )}
      <RemoveRowButtons
        confirming={confirming}
        isPending={remove.isPending}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        onStartConfirm={() => setConfirming(true)}
        onCancel={() => setConfirming(false)}
        onRemove={handleRemove}
        wrapperClassName="flex gap-1"
        triggerClassName="text-red-600 hover:text-red-700"
      />
    </div>
  );
}
