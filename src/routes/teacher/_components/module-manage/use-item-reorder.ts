import { useState } from "react";
import { toast } from "sonner";
import type { CourseContentItem } from "@/lib/api/types/common";
import type { ReorderItemsMutation } from "./types";

/**
 * Native HTML5 drag-and-drop reordering for the curriculum list: the grabbed
 * row, the hovered row, and the drop that PUTs the whole new id order.
 *
 * Extracted from the former 293-line `ModuleManagePage`. The order of state
 * updates inside `handleDrop` is observable (the mutation fires BEFORE the drag
 * indices are cleared), so it is carried over unchanged; `sortedItems` is now a
 * parameter because the page only derives it after its early returns.
 */
export function useItemReorder(options: {
  reorderItems: ReorderItemsMutation;
}) {
  const { reorderItems } = options;
  const [dragSourceIdx, setDragSourceIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  function startDrag(idx: number, e: React.DragEvent) {
    setDragSourceIdx(idx);
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    e.dataTransfer.setDragImage(
      el,
      e.clientX - rect.left,
      e.clientY - rect.top,
    );
  }

  function dragOver(idx: number, e: React.DragEvent) {
    e.preventDefault();
    setDragOverIdx(idx);
  }

  function endDrag() {
    setDragSourceIdx(null);
    setDragOverIdx(null);
  }

  function handleDrop(sortedItems: CourseContentItem[], dropIdx: number) {
    if (dragSourceIdx === null || dragSourceIdx === dropIdx) {
      setDragSourceIdx(null);
      setDragOverIdx(null);
      return;
    }
    const newOrder = [...sortedItems];
    const [moved] = newOrder.splice(dragSourceIdx, 1);
    newOrder.splice(dropIdx, 0, moved);
    reorderItems.mutate(
      newOrder.map((i) => i.id),
      {
        onError: (err) =>
          toast.error((err as Error).message || "Reorder failed"),
      },
    );
    setDragSourceIdx(null);
    setDragOverIdx(null);
  }

  return {
    dragSourceIdx,
    dragOverIdx,
    startDrag,
    dragOver,
    endDrag,
    handleDrop,
  };
}

export type ItemReorderController = ReturnType<typeof useItemReorder>;
