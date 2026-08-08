import { useState } from "react";
import { toast } from "sonner";
import {
  useCreateCourseOutcome,
  useDeleteCourseOutcome,
  useDuplicateCourseOutcome,
  useTeacherCourseOutcomes,
  useUpdateCourseOutcome,
} from "@/lib/api/hooks/courses";
import { useTeacherCourseById } from "@/lib/api/hooks/teacher-courses";
import { makeTreeActions } from "./use-outcome-tree-actions";
import type { CourseOutcome, TranslateFn } from "./types";

/**
 * The learning-outcomes outliner state machine.
 *
 * One editing pass is the point: click a row's text and keep typing. Enter
 * saves the row and opens a fresh sibling below it; Tab nests the row under
 * the one above; Shift+Tab lifts it out; Backspace on an empty row deletes
 * it; Alt+↑/↓ move it among siblings. A drag handle covers mouse users with
 * the same two operations (drop between = reorder, drop onto = reparent).
 *
 * The tree-move payload math lives in `use-outcome-tree-actions.ts`; this
 * hook owns state (which row is editing, the unsaved draft row, the delete
 * confirmation, the drag) and the create/commit/save flows.
 */
export function useCourseOutcomesEditor(options: {
  courseId: string;
  t: TranslateFn;
}) {
  const { courseId, t } = options;
  const { data: course } = useTeacherCourseById(courseId);
  const { data: outcomes = [] } = useTeacherCourseOutcomes(courseId);
  const createOutcome = useCreateCourseOutcome(courseId);
  const updateOutcome = useUpdateCourseOutcome(courseId);
  const deleteOutcome = useDeleteCourseOutcome(courseId);
  const duplicateOutcome = useDuplicateCourseOutcome(courseId);

  const editable = (course?.status ?? "draft") === "draft";

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // The unsaved row Enter leaves behind; it renders below the row it follows.
  const [draft, setDraft] = useState<{
    parentId: string | null;
    afterId: string;
  } | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const tree = makeTreeActions({
    outcomes,
    update: updateOutcome,
    delete: deleteOutcome,
    t,
  });

  async function saveText(id: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await updateOutcome.mutateAsync({
        outcomeId: id,
        outcome_text: trimmed,
      });
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_outcomes.update_failed", "Failed to update outcome"),
      );
    }
  }

  /** Enter on a saved row: save it, then open a fresh sibling below. */
  function createSiblingBelow(outcome: CourseOutcome, text: string) {
    void saveText(outcome.id, text);
    setDraft({ parentId: outcome.parent_id ?? null, afterId: outcome.id });
  }

  /** Enter on the draft row: persist it and open another sibling below. */
  async function commitDraft(text: string) {
    const trimmed = text.trim();
    if (!draft) return;
    if (!trimmed) {
      setDraft(null);
      return;
    }
    try {
      const created = await createOutcome.mutateAsync({
        outcome_text: trimmed,
        parent_id: draft.parentId,
      });
      setDraft({ parentId: draft.parentId, afterId: created.id });
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_outcomes.add_failed", "Failed to add outcome"),
      );
    }
  }

  function cancelEditing() {
    setEditingId(null);
    setDraft(null);
  }

  function handleDelete(id: string, promote: boolean) {
    void tree.delete(id, promote).then(() => setPendingDeleteId(null));
  }

  return {
    outcomes,
    createOutcome,
    updateOutcome,
    deleteOutcome,
    duplicateOutcome,
    editable,
    open,
    setOpen,
    editingId,
    setEditingId,
    draft,
    setDraft,
    pendingDeleteId,
    setPendingDeleteId,
    draggingId,
    setDraggingId,
    saveText,
    createSiblingBelow,
    commitDraft,
    cancelEditing,
    moveUp: (o: CourseOutcome) => void tree.moveUp(o),
    moveDown: (o: CourseOutcome) => void tree.moveDown(o),
    indent: (o: CourseOutcome) => void tree.indent(o),
    outdent: (o: CourseOutcome) => void tree.outdent(o),
    dropOn: (d: string, tgt: string, pos: "before" | "after" | "onto") =>
      void tree.dropOn(d, tgt, pos),
    handleDelete,
  };
}

export type CourseOutcomesController = ReturnType<
  typeof useCourseOutcomesEditor
>;
