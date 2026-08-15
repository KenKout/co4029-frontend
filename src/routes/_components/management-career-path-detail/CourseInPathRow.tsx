import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Select } from "@/components/ui/select";
import {
  useRemoveCareerPathCourse,
  useUpdateCareerPathCourse,
} from "@/lib/api/hooks/career-paths";
import { Button } from "@/components/ui/button";
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
 *
 * The mutation controls (arrows, selects, remove) live in CourseRowControls
 * and render only for managers; HODs get the read-only row.
 */
export function CourseInPathRow({
  row,
  index,
  stageTotal,
  pathId,
  controller,
  stages,
  stagesController,
  canManage,
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
  canManage: boolean;
}) {
  const { t } = useTranslation();
  const prefix = "management_career_path_detail.stages";

  // The legacy `labels.required_or_optional` key is a single "Required /
  // Optional" string that the read-only marker used to split on " / ". The
  // select needs the two halves as real options, so fall back to splitting it
  // when the dedicated keys are absent.
  const requiredOrOptional = t(
    "management_career_path_detail.labels.required_or_optional",
  );
  const [legacyRequired, legacyOptional] = requiredOrOptional.split(" / ");
  const requiredLabel = t(`${prefix}.required_or_optional.required`, {
    defaultValue: legacyRequired ?? "Required",
  });
  const optionalLabel = t(`${prefix}.required_or_optional.optional`, {
    defaultValue: legacyOptional ?? "Optional",
  });

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-m3-surface-container-low ghost-border">
      {canManage && (
        <div className="flex flex-col gap-0.5 shrink-0">
          <Button variant="ghost"
            type="button"
            onClick={() => controller.moveInStage(row.stage_id, index, -1)}
            disabled={index === 0}
            className="p-1 rounded hover:bg-m3-surface-container disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer h-auto whitespace-normal"
            title={t("management_career_path_detail.actions.move_up")}
          >
            <ArrowUp className="h-3 w-3 text-m3-on-surface-variant" />
          </Button>
          <Button variant="ghost"
            type="button"
            onClick={() => controller.moveInStage(row.stage_id, index, 1)}
            disabled={index === stageTotal - 1}
            className="p-1 rounded hover:bg-m3-surface-container disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer h-auto whitespace-normal"
            title={t("management_career_path_detail.actions.move_down")}
          >
            <ArrowDown className="h-3 w-3 text-m3-on-surface-variant" />
          </Button>
        </div>
      )}
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
          {/* The editable select below is `sm:block`, so without this the
              required/optional state would be invisible on mobile — the
              read-only marker this replaced was always shown. */}
          <span
            className={`sm:hidden text-[10px] font-bold uppercase ${
              row.is_required
                ? "text-m3-primary"
                : "text-m3-on-surface-variant"
            }`}
          >
            {row.is_required ? requiredLabel : optionalLabel}
          </span>
          {/* Satisfied-by stays display-only: only 'completion' exists —
              'pass' was dropped from the schema (migration 0073) because
              it had no evaluator. */}
          <span className="text-[10px] text-m3-on-surface-variant">
            {t(`${prefix}.fields.satisfied_by`)}:{" "}
            {t(`${prefix}.satisfied_by.${row.satisfied_by}`)}
          </span>
        </div>
      </div>
      {canManage && (
        <CourseRowControls
          row={row}
          pathId={pathId}
          controller={controller}
          stages={stages}
          stagesController={stagesController}
          requiredLabel={requiredLabel}
          optionalLabel={optionalLabel}
        />
      )}
    </div>
  );
}

/**
 * Manager-only mutation controls for an attached course: the editable
 * required/optional select, the move-to-another-stage select and the remove
 * button. HODs (read-only) never see these — the backend rejects the writes
 * anyway, so hiding them keeps the surface honest.
 */
function CourseRowControls({
  row,
  pathId,
  controller,
  stages,
  stagesController,
  requiredLabel,
  optionalLabel,
}: {
  row: CareerPathCourseAuthoring;
  pathId: string;
  controller: CoursesTabController;
  stages: CareerPathStageAuthoring[];
  stagesController: StagesTabController;
  requiredLabel: string;
  optionalLabel: string;
}) {
  const { t } = useTranslation();
  const remove = useRemoveCareerPathCourse(pathId, row.course_id);
  const update = useUpdateCareerPathCourse(pathId);
  const [confirming, setConfirming] = useState(false);
  const prefix = "management_career_path_detail.stages";

  function handleRequiredChange(next: string) {
    const isRequired = next === "required";
    if (isRequired === row.is_required) return;
    update.mutate(
      { courseId: row.course_id, payload: { is_required: isRequired } },
      {
        onSuccess: () =>
          toast.success(t("management_career_path_detail.toasts.course_updated")),
        // Flipping optional -> required shrinks the stage's optional count and
        // can push it below `min_optional_to_complete`; the backend rejects
        // that rather than leaving a stage nobody can finish, so the reason
        // has to reach the manager.
        onError: (err) =>
          toast.error(
            (err as Error).message ||
              t("management_career_path_detail.errors.update_course_failed"),
          ),
      },
    );
  }

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

  return (
    <>
      {/* Required / optional is EDITABLE: it was write-once at attach time,
          which meant a stage could never hold an optional course and so
          `min_optional_to_complete` could only ever be 0. */}
      <div className="shrink-0 w-32 hidden sm:block">
        <Select<string>
          value={row.is_required ? "required" : "optional"}
          onValueChange={handleRequiredChange}
          disabled={update.isPending}
          size="sm"
          options={[
            { value: "required", label: requiredLabel },
            { value: "optional", label: optionalLabel },
          ]}
          aria-label={t(`${prefix}.fields.required_or_optional`)}
        />
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
    </>
  );
}
