import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import {
  useCareerPathStages,
  useCreateCareerPathStage,
  useDeleteCareerPathStage,
  useMoveCareerPathCourseToStage,
  useReorderCareerPathStages,
  useUpdateCareerPathStage,
} from "@/lib/api/hooks/career-paths";
import type {
  CareerPathStageAuthoring,
  CareerPathStageReorderWarning,
  CareerPathStageUpdate,
} from "@/lib/api/types";
import { swapRows } from "./helpers";

/**
 * Everything stateful behind the stages surface: the stage list, CRUD
 * mutations, the local reorder buffer and the reorder warnings the backend
 * returns instead of rewriting a manager's unlock policy.
 */
export function useStagesTab(id: string, t: TFunction, versionId?: string) {
  const list = useCareerPathStages(id, versionId);
  const create = useCreateCareerPathStage(id);
  const update = useUpdateCareerPathStage(id);
  const remove = useDeleteCareerPathStage(id);
  const reorder = useReorderCareerPathStages(id);
  const moveCourse = useMoveCareerPathCourseToStage(id);

  const [order, setOrder] = useState<CareerPathStageAuthoring[] | null>(null);
  const [warnings, setWarnings] = useState<CareerPathStageReorderWarning[]>([]);
  const [openSettingsFor, setOpenSettingsFor] = useState<string | null>(null);

  const baseRows = useMemo(
    () =>
      [...(list.data ?? [])].sort((a, b) => a.position - b.position),
    [list.data],
  );
  const rows = order ?? baseRows;

  const hasReorderChanges = useMemo(() => {
    if (!order) return false;
    if (order.length !== baseRows.length) return true;
    return order.some((s, idx) => s.id !== baseRows[idx]?.id);
  }, [order, baseRows]);

  /** Display name for a stage: NULL title renders "Stage {position}" in the
   *  user's own locale — the backend never stores an English default. */
  function stageLabel(stage: {
    title: string | null;
    position: number;
  }): string {
    return (
      stage.title?.trim() ||
      t("management_career_path_detail.stages.unnamed", {
        position: stage.position,
      })
    );
  }

  function handleCreate() {
    create.mutate(
      {},
      {
        onSuccess: () => {
          toast.success(t("management_career_path_detail.stages.toasts.created"));
          setOrder(null);
        },
        onError: (err) =>
          toast.error(
            (err as Error).message ||
              t("management_career_path_detail.stages.errors.create_failed"),
          ),
      },
    );
  }

  function handleUpdate(stageId: string, payload: CareerPathStageUpdate) {
    update.mutate(
      { stageId, payload },
      {
        onSuccess: () => {
          toast.success(t("management_career_path_detail.stages.toasts.updated"));
          setOpenSettingsFor(null);
        },
        onError: (err) =>
          toast.error(
            (err as Error).message ||
              t("management_career_path_detail.stages.errors.update_failed"),
          ),
      },
    );
  }

  function handleDelete(stageId: string) {
    remove.mutate(stageId, {
      onSuccess: () => {
        toast.success(t("management_career_path_detail.stages.toasts.deleted"));
        setOrder(null);
      },
      // A 409 here is the deliberate guard: the stage still holds courses, or
      // a student has already completed it and deleting it would move their
      // progress bar. Show the backend's reason.
      onError: (err) =>
        toast.error(
          (err as Error).message ||
            t("management_career_path_detail.stages.errors.delete_failed"),
        ),
    });
  }

  function move(idx: number, delta: number) {
    const target = idx + delta;
    if (target < 0 || target >= rows.length) return;
    setOrder(swapRows(rows, idx, target));
  }

  function handleSubmitReorder() {
    if (!order) return;
    reorder.mutate(
      order.map((s) => s.id),
      {
        onSuccess: (result) => {
          toast.success(
            t("management_career_path_detail.stages.toasts.order_updated"),
          );
          // Surface, never swallow: the backend warns rather than rewriting
          // unlock_policy, so the manager has to see what changed.
          setWarnings(result.warnings ?? []);
          setOrder(null);
        },
        onError: (err) =>
          toast.error(
            (err as Error).message ||
              t("management_career_path_detail.stages.errors.reorder_failed"),
          ),
      },
    );
  }

  function handleMoveCourse(courseId: string, stageId: string) {
    moveCourse.mutate(
      { courseId, payload: { stage_id: stageId } },
      {
        onSuccess: () =>
          toast.success(
            t("management_career_path_detail.stages.toasts.course_moved"),
          ),
        onError: (err) =>
          toast.error(
            (err as Error).message ||
              t(
                "management_career_path_detail.stages.errors.move_course_failed",
              ),
          ),
      },
    );
  }

  return {
    list,
    create,
    update,
    remove,
    reorder,
    moveCourse,
    rows,
    baseRows,
    order,
    setOrder,
    hasReorderChanges,
    warnings,
    dismissWarnings: () => setWarnings([]),
    openSettingsFor,
    setOpenSettingsFor,
    stageLabel,
    handleCreate,
    handleUpdate,
    handleDelete,
    move,
    handleSubmitReorder,
    handleMoveCourse,
  };
}

export type StagesTabController = ReturnType<typeof useStagesTab>;
