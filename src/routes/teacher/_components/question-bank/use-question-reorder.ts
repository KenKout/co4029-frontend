import { useState } from "react";
import { toast } from "sonner";

import type { InterviewQuestionAuthoring } from "@/lib/api/types";
import type { TranslateFn, UpdateQuestionMutation } from "./types";

/**
 * Reordering for the Question Bank — move-to-top/bottom plus native HTML5
 * drag-and-drop — extracted from the former 2.4k-line question-bank.tsx.
 *
 * `dragIndex` is the grabbed row; `dragOverIndex` + `dropBefore` place the
 * insertion LINE at the top (dropBefore) or bottom edge of the hovered card,
 * so the teacher sees exactly which gap the drop will land in.
 */
export function useQuestionReorder(options: {
  sorted: InterviewQuestionAuthoring[];
  updateQuestion: UpdateQuestionMutation;
  announce: (msg: string) => void;
  t: TranslateFn;
}) {
  const { sorted, updateQuestion, announce, t } = options;
  const [reordering, setReordering] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropBefore, setDropBefore] = useState<boolean>(true);

  // Move a question from one index to an arbitrary target index (drag-drop or
  // move-to-top/bottom). Renumbers only the affected span, using a two-phase
  // temp-then-final assignment so the (config_id, position) unique constraint
  // is never violated mid-reorder. Mirrors the 3-PATCH swap `handleReorder`
  // does, generalized to any distance.
  async function handleMoveTo(fromIndex: number, toIndex: number) {
    if (reordering) return;
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= sorted.length) return;
    if (toIndex < 0 || toIndex >= sorted.length) return;

    // The ordered list of existing position values — slot i keeps positions[i];
    // items move between slots.
    const positions = sorted.map((q, i) => q.position ?? i + 1);
    const newOrder = [...sorted];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);

    // Only the items whose slot changed need a PATCH.
    const changed = newOrder
      .map((q, i) => ({
        id: q.id,
        desired: positions[i],
        prev: q.position ?? 0,
      }))
      .filter((c) => c.desired !== c.prev);
    if (changed.length === 0) return;

    const maxPos = Math.max(...positions);
    setReordering(true);
    try {
      // Phase 1: park every changed item at a unique temp position above the
      // current max, freeing their final slots without collision.
      let temp = maxPos + 1;
      for (const c of changed) {
        await updateQuestion.mutateAsync({
          questionId: c.id,
          patch: { position: temp },
        });
        temp += 1;
      }
      // Phase 2: drop each into its final position.
      for (const c of changed) {
        await updateQuestion.mutateAsync({
          questionId: c.id,
          patch: { position: c.desired },
        });
      }
      announce(
        t("teacher_interview_config.qbank.sr.moved", { position: toIndex + 1 }),
      );
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_interview_config.toasts.question_reorder_failed"),
      );
    } finally {
      setReordering(false);
    }
  }

  function handleDragOverCard(cardIndex: number, before: boolean) {
    setDragOverIndex(cardIndex);
    setDropBefore(before);
  }
  function handleDrop() {
    const from = dragIndex;
    const over = dragOverIndex;
    const before = dropBefore;
    setDragIndex(null);
    setDragOverIndex(null);
    if (from === null || over === null) return;
    // Gap in original-array coordinates (0..length): the slot the line marks.
    const insertionIndex = before ? over : over + 1;
    // Translate the gap to handleMoveTo's post-removal target index: removing
    // the dragged row shifts everything after it left by one.
    let to = from < insertionIndex ? insertionIndex - 1 : insertionIndex;
    to = Math.max(0, Math.min(sorted.length - 1, to));
    void handleMoveTo(from, to);
  }
  function startDrag(index: number) {
    setDragIndex(index);
  }
  function endDrag() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  return {
    reordering,
    dragIndex,
    dragOverIndex,
    dropBefore,
    handleMoveTo,
    handleDragOverCard,
    handleDrop,
    startDrag,
    endDrag,
  };
}
