import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useDuplicateModule,
  useReorderModuleItems,
  useUpdateModule,
} from "@/lib/api/hooks/teacher-courses";
import type { CourseContentModule } from "@/lib/api/types/common";
import { computeModuleItemStats, publishItemRequest } from "./helpers";
import type { TranslateFn } from "./types";

/**
 * All of a module card's state: inline title editing, the module + item
 * mutations, the item drag indices, the module drag-arming flag and the
 * publish-all progress flag — plus the handlers that drive them.
 *
 * Extracted from the former 414-line / complexity-32 `ModuleAccordion`. The
 * hook calls keep their original order (`useState` ×2, `useRef`,
 * `useUpdateModule`, `useReorderModuleItems`, `useDuplicateModule`,
 * `useQueryClient`, `useState` ×4) so the card's hook slots are unchanged, and
 * every expression is carried over character-for-character.
 */
export function useModuleAccordion(options: {
  module: CourseContentModule;
  courseId: string;
  t: TranslateFn;
}) {
  const { module, courseId, t } = options;
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(module.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const updateModule = useUpdateModule(module.id, courseId);
  const reorderItems = useReorderModuleItems(module.id, courseId);
  const duplicateModule = useDuplicateModule(courseId);

  function handleDuplicateModule(e: React.MouseEvent) {
    e.stopPropagation();
    duplicateModule.mutate(module.id, {
      onSuccess: () =>
        toast.success(
          t("teacher_common.module_duplicated", "Module duplicated as a draft"),
        ),
      onError: (err: unknown) =>
        toast.error(
          (err as Error).message ||
            t("teacher_common.duplicate_failed", "Could not duplicate"),
        ),
    });
  }
  const qc = useQueryClient();

  const [dragSourceIdx, setDragSourceIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  // Module dragging is armed only while the header grip is held so the title
  // edit / edit-link / publish controls in the header stay clickable.
  const [moduleDragEnabled, setModuleDragEnabled] = useState(false);
  const [publishingAll, setPublishingAll] = useState(false);

  const stats = computeModuleItemStats(module);
  const { allItemsSorted, draftItems } = stats;

  function handleDrop(dropIdx: number) {
    if (dragSourceIdx === null || dragSourceIdx === dropIdx) {
      setDragSourceIdx(null);
      setDragOverIdx(null);
      return;
    }
    const newOrder = [...allItemsSorted];
    const [moved] = newOrder.splice(dragSourceIdx, 1);
    newOrder.splice(dropIdx, 0, moved);
    const allIds = newOrder.map((item) => item.id);
    reorderItems.mutate(allIds, {
      onError: (err) =>
        toast.error(
          (err as Error).message || t("teacher_common.reorder_failed"),
        ),
    });
    setDragSourceIdx(null);
    setDragOverIdx(null);
  }

  function startEditTitle(e: React.MouseEvent) {
    e.stopPropagation();
    setTitleDraft(module.title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  }

  function saveTitle() {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== module.title) {
      updateModule.mutate(
        { title: trimmed },
        {
          onError: (err) => toast.error((err as Error).message),
        },
      );
    }
  }

  function toggleStatus(e: React.MouseEvent) {
    e.stopPropagation();
    const next = module.status === "published" ? "draft" : "published";
    updateModule.mutate(
      { status: next },
      {
        onSuccess: () =>
          toast.success(
            t("teacher_common.module_status_set", {
              status: t(`teacher_dashboard.status.${next}`),
            }),
          ),
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  // Publish-all (T#2): fire a publish for every draft item in this module in
  // parallel. Best-effort with a summary toast; the content query is
  // invalidated once at the end.
  async function handlePublishAll(e: React.MouseEvent) {
    e.stopPropagation();
    if (draftItems.length === 0 || publishingAll) return;
    setPublishingAll(true);
    const results = await Promise.allSettled(
      draftItems.map((i) => publishItemRequest(i)),
    );
    setPublishingAll(false);
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - ok;
    void qc.invalidateQueries({
      queryKey: ["teacher", "courses", courseId, "content"],
    });
    if (failed > 0) {
      toast.warning(t("teacher_common.publish_all_partial", { ok, failed }));
    } else {
      toast.success(t("teacher_common.publish_all_done", { count: ok }));
    }
  }

  return {
    stats,
    editingTitle,
    setEditingTitle,
    titleDraft,
    setTitleDraft,
    titleInputRef,
    updateModule,
    duplicateModule,
    dragSourceIdx,
    setDragSourceIdx,
    dragOverIdx,
    setDragOverIdx,
    moduleDragEnabled,
    setModuleDragEnabled,
    publishingAll,
    handleDuplicateModule,
    handleDrop,
    startEditTitle,
    saveTitle,
    toggleStatus,
    handlePublishAll,
  };
}

export type ModuleAccordionController = ReturnType<typeof useModuleAccordion>;
