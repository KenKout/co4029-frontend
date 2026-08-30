import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import type { SelectableEntity } from "@/components/ui/entity-multi-select-dialog";
import { getApiErrorMessage } from "@/lib/api/error-codes";
import {
  useAddCareerPathCourse,
  useCareerPathCourseCandidates,
  useCareerPathCourses,
  useReorderCareerPathCourses,
} from "@/lib/api/hooks/career-paths";
import type { CareerPathCourseAuthoring } from "@/lib/api/types";
import {
  courseOrderChanged,
  sortCoursesByPosition,
  swapRows,
  toCourseCandidates,
} from "./helpers";

/**
 * Everything stateful behind the courses tab: the attached-course list, the
 * add + reorder mutations, the catalogue picker state and the local drag-free
 * reorder buffer.
 *
 * The hook calls below are in the exact order `CoursesTab` used to make them
 * (list -> add -> reorder -> local state -> catalogue -> derived memos), and
 * `t` is injected so no extra `useTranslation` is introduced.
 */
export function useCoursesTab(
  id: string,
  t: TFunction,
  versionId?: string,
  pathPublished = false,
) {
  const list = useCareerPathCourses(id, versionId);
  const add = useAddCareerPathCourse(id);
  const reorder = useReorderCareerPathCourses(id);

  const [order, setOrder] = useState<CareerPathCourseAuthoring[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [courseQuery, setCourseQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  /**
   * Which stage the picker will attach to. Every course item belongs to a
   * stage (backend migration 0070), so the picker must know its target before
   * it can add anything.
   */
  const [targetStageId, setTargetStageId] = useState<string | null>(null);

  const catalogue = useCareerPathCourseCandidates(id, pickerOpen);

  const baseRows = useMemo(() => sortCoursesByPosition(list.data), [list.data]);
  const rows = order ?? baseRows;
  const hasReorderChanges = useMemo(() => {
    if (!order) return false;
    return courseOrderChanged(order, baseRows);
  }, [order, baseRows]);

  /** Attached courses grouped by `stage_id`, each group in position order. */
  const rowsByStage = useMemo(() => {
    const grouped = new Map<string, CareerPathCourseAuthoring[]>();
    for (const row of rows) {
      const bucket = grouped.get(row.stage_id);
      if (bucket) bucket.push(row);
      else grouped.set(row.stage_id, [row]);
    }
    for (const bucket of grouped.values()) {
      bucket.sort((a, b) => a.position - b.position);
    }
    return grouped;
  }, [rows]);

  // Map the org catalogue to the dialog shape and filter client-side by
  // title/slug. The candidates endpoint returns the full org catalogue
  // (ANY status — a draft path may hold draft courses), so rows carry a
  // status badge letting the manager tell draft from published at a glance.
  // On a PUBLISHED path the backend refuses anything but published courses,
  // so those rows are disabled with a reason instead of 409-ing on confirm.
  // Already-attached courses are dropped from the list entirely — per the
  // "remove, not disable" rule, an attached course has no business in a
  // picker whose job is picking NEW courses.
  const alreadyAddedCourseIds = useMemo(
    () => new Set(baseRows.map((r) => r.course_id)),
    [baseRows],
  );
  const courseCandidates: SelectableEntity[] = useMemo(
    () =>
      toCourseCandidates(catalogue.data, courseQuery, pathPublished).filter(
        (c) => !alreadyAddedCourseIds.has(c.id),
      ),
    [catalogue.data, courseQuery, alreadyAddedCourseIds, pathPublished],
  );

  function openPickerForStage(stageId: string) {
    setTargetStageId(stageId);
    setPickerOpen(true);
  }

  async function handleConfirmCourses(selected: SelectableEntity[]) {
    if (!targetStageId) {
      toast.error(
        t("management_career_path_detail.stages.errors.pick_stage_first"),
      );
      return;
    }
    setSubmitting(true);
    let ok = 0;
    // Backend has only a single-item add route; loop sequentially so each
    // gets an append position and one failure doesn't abort the rest.
    for (const entity of selected) {
      try {
        await add.mutateAsync({
          stage_id: targetStageId,
          course_id: entity.id,
          is_required: true,
        });
        ok += 1;
      } catch (err) {
        toast.error(
          getApiErrorMessage(
            err,
            t("management_career_path_detail.errors.add_course_failed"),
          ),
        );
      }
    }
    setSubmitting(false);
    if (ok > 0) {
      toast.success(
        t("management_career_path_detail.toasts.courses_added", { count: ok }),
      );
      setOrder(null);
    }
    setPickerOpen(false);
    setCourseQuery("");
  }

  /**
   * Swap two courses WITHIN one stage.
   *
   * `idx`/`delta` are indices inside `stageId`'s own group, not into the flat
   * list — positions are unique per `(stage_id, position)` now, so reordering
   * is a per-stage operation. The buffer stays a flat array because the
   * reorder endpoint takes the full ordered id list and renumbers each stage
   * from the relative order within it.
   */
  function moveInStage(stageId: string, idx: number, delta: number) {
    const group = rowsByStage.get(stageId) ?? [];
    const target = idx + delta;
    if (target < 0 || target >= group.length) return;
    const a = group[idx];
    const b = group[target];
    if (!a || !b) return;
    const flatA = rows.findIndex((r) => r.course_id === a.course_id);
    const flatB = rows.findIndex((r) => r.course_id === b.course_id);
    if (flatA < 0 || flatB < 0) return;
    setOrder(swapRows(rows, flatA, flatB));
  }

  function handleSubmitReorder() {
    if (!order) return;
    reorder.mutate(
      order.map((r) => r.course_id),
      {
        onSuccess: () => {
          toast.success(
            t("management_career_path_detail.toasts.order_updated"),
          );
          setOrder(null);
        },
        onError: (err) =>
          toast.error(
            (err as Error).message ||
              t("management_career_path_detail.errors.update_order_failed"),
          ),
      },
    );
  }

  function closePicker() {
    setPickerOpen(false);
    setCourseQuery("");
  }

  function removeLocally(courseId: string) {
    if (order) setOrder(order.filter((r) => r.course_id !== courseId));
  }

  return {
    list,
    add,
    reorder,
    order,
    setOrder,
    pickerOpen,
    setPickerOpen,
    courseQuery,
    setCourseQuery,
    submitting,
    catalogue,
    baseRows,
    rows,
    rowsByStage,
    targetStageId,
    openPickerForStage,
    hasReorderChanges,
    alreadyAddedCourseIds,
    courseCandidates,
    handleConfirmCourses,
    moveInStage,
    handleSubmitReorder,
    closePicker,
    removeLocally,
  };
}

export type CoursesTabController = ReturnType<typeof useCoursesTab>;
