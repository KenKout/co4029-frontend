import { useState } from "react";
import { toast } from "sonner";
import {
  useCreateCourseOutcome,
  useDeleteCourseOutcome,
  useTeacherCourseOutcomes,
  useUpdateCourseOutcome,
} from "@/lib/api/hooks/courses";
import { useTeacherCourseById } from "@/lib/api/hooks/teacher-courses";
import type { TranslateFn } from "./types";

/**
 * The learning-outcomes list plus every piece of inline edit state: the panel
 * open flag, the new-outcome text, the row being edited, the row awaiting
 * delete confirmation and the parent whose sub-outcome input is open.
 *
 * Extracted from the former 363-line `LearningOutcomesPanel`. The hook calls
 * keep their original order (the course query, the outcomes query, the three
 * mutations, then the seven `useState`s) so the panel's hook slots are
 * unchanged, and every expression is carried over character-for-character.
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

  // Learning outcomes are editable only while the course is an unpublished
  // draft — once published they're frozen (they double as the graded
  // assessment scale). The backend enforces this with 409; here we hide the
  // add/edit/delete affordances so the read-only state is obvious.
  const editable = (course?.status ?? "draft") === "draft";

  const [open, setOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // Inline "add child" state: the parent whose child-input is open + its text.
  const [addChildParentId, setAddChildParentId] = useState<string | null>(null);
  const [childText, setChildText] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const text = newText.trim();
    if (!text) return;
    try {
      await createOutcome.mutateAsync({ outcome_text: text });
      setNewText("");
      toast.success(t("teacher_outcomes.added", "Learning outcome added"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_outcomes.add_failed", "Failed to add outcome"),
      );
    }
  }

  function startAddChild(parentId: string) {
    setAddChildParentId(parentId);
    setChildText("");
  }
  function cancelAddChild() {
    setAddChildParentId(null);
    setChildText("");
  }
  async function handleAddChild(parentId: string) {
    const text = childText.trim();
    if (!text) return;
    try {
      await createOutcome.mutateAsync({
        outcome_text: text,
        parent_id: parentId,
      });
      cancelAddChild();
      toast.success(t("teacher_outcomes.child_added", "Sub-outcome added"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_outcomes.add_failed", "Failed to add outcome"),
      );
    }
  }

  function startEdit(id: string, text: string) {
    setEditingId(id);
    setEditText(text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function handleSaveEdit(id: string) {
    const text = editText.trim();
    if (!text) return;
    try {
      await updateOutcome.mutateAsync({ outcomeId: id, outcome_text: text });
      cancelEdit();
      toast.success(t("teacher_outcomes.updated", "Learning outcome updated"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_outcomes.update_failed", "Failed to update outcome"),
      );
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteOutcome.mutateAsync(id);
      setPendingDeleteId(null);
      toast.success(t("teacher_outcomes.deleted", "Learning outcome deleted"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_outcomes.delete_failed", "Failed to delete outcome"),
      );
    }
  }

  return {
    outcomes,
    createOutcome,
    updateOutcome,
    deleteOutcome,
    editable,
    open,
    setOpen,
    newText,
    setNewText,
    editingId,
    editText,
    setEditText,
    pendingDeleteId,
    setPendingDeleteId,
    addChildParentId,
    childText,
    setChildText,
    handleAdd,
    startAddChild,
    cancelAddChild,
    handleAddChild,
    startEdit,
    cancelEdit,
    handleSaveEdit,
    handleDelete,
  };
}

export type CourseOutcomesController = ReturnType<
  typeof useCourseOutcomesEditor
>;
