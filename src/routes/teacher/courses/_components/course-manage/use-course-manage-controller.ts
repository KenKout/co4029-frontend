import { useEffect, useRef, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useReorderModules,
  useTeacherCourseContent,
} from "@/lib/api/hooks/teacher-courses";
import type { CourseContentModule } from "@/lib/api/types/common";

/**
 * Page state of the teacher course-management page, extracted from the former
 * 255-line course-manage.tsx: module open/close persistence, the ref registry
 * the quick-nav scrolls through, and module-level drag reordering.
 *
 * The hook sequence is unchanged — translation, params, the content query, the
 * `addingModule` state, the persisted `openMap` state with its `useEffect`, the
 * ref registry, the reorder mutation, then the two drag-index states.
 */
export interface CourseManageController {
  courseId: string;
  isLoading: boolean;
  modules: CourseContentModule[];
  addingModule: boolean;
  setAddingModule: (value: boolean) => void;
  openMap: Record<string, boolean>;
  toggleModule: (id: string) => void;
  setAllModules: (open: boolean) => void;
  registerModuleRef: (id: string, el: HTMLDivElement | null) => void;
  scrollToModule: (id: string) => void;
  modDragIdx: number | null;
  setModDragIdx: (value: number | null) => void;
  modDragOverIdx: number | null;
  setModDragOverIdx: (value: number | null) => void;
  handleModuleDrop: (dropIdx: number) => void;
}

export function useCourseManageController(): CourseManageController {
  const { t } = useTranslation();
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  const { data: content, isLoading } = useTeacherCourseContent(courseId);
  const [addingModule, setAddingModule] = useState(false);

  const modules = content?.modules ?? [];

  // Per-course open/closed state, persisted to localStorage (T#: "remember what
  // I last had open"). Keyed by module id. A module absent from the map falls
  // back to closed. Seeded once from storage; every toggle writes back.
  const storageKey = `co4029:course-manage:open:${courseId}`;
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(openMap));
    } catch {
      /* storage full / unavailable — non-fatal, state still works in-memory */
    }
  }, [openMap, storageKey]);
  function toggleModule(id: string) {
    setOpenMap((m) => ({ ...m, [id]: !m[id] }));
  }
  function setAllModules(open: boolean) {
    setOpenMap(Object.fromEntries(modules.map((m) => [m.id, open])));
  }

  // Ref registry so the quick-nav rail can scroll a module into view (T#3/#4).
  const moduleRefs = useRef<Record<string, HTMLDivElement | null>>({});
  function registerModuleRef(id: string, el: HTMLDivElement | null) {
    moduleRefs.current[id] = el;
  }

  // Module drag-reorder. dragEnabled is armed only while the module grip is
  // held (same pattern as item rows) so the header's title/buttons stay usable.
  const reorderModules = useReorderModules(courseId);
  const [modDragIdx, setModDragIdx] = useState<number | null>(null);
  const [modDragOverIdx, setModDragOverIdx] = useState<number | null>(null);
  function handleModuleDrop(dropIdx: number) {
    if (modDragIdx === null || modDragIdx === dropIdx) {
      setModDragIdx(null);
      setModDragOverIdx(null);
      return;
    }
    const newOrder = [...modules];
    const [moved] = newOrder.splice(modDragIdx, 1);
    newOrder.splice(dropIdx, 0, moved);
    reorderModules.mutate(
      newOrder.map((m) => m.id),
      {
        onError: (err) =>
          toast.error(
            (err as Error).message || t("teacher_common.reorder_failed"),
          ),
      },
    );
    setModDragIdx(null);
    setModDragOverIdx(null);
  }
  function scrollToModule(id: string) {
    // Ensure it's open before scrolling so the target has its full height.
    setOpenMap((m) => (m[id] ? m : { ...m, [id]: true }));
    requestAnimationFrame(() => {
      moduleRefs.current[id]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return {
    courseId,
    isLoading,
    modules,
    addingModule,
    setAddingModule,
    openMap,
    toggleModule,
    setAllModules,
    registerModuleRef,
    scrollToModule,
    modDragIdx,
    setModDragIdx,
    modDragOverIdx,
    setModDragOverIdx,
    handleModuleDrop,
  };
}
