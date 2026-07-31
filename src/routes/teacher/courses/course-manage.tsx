import { useState, useRef, useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Plus, GripVertical, CheckCheck, CircleDot } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import {
  useTeacherCourseContent,
  useReorderModules,
} from "@/lib/api/hooks/teacher-courses";
import type { CourseContentItem } from "@/lib/api/types/common";
import { CourseSettingsPanel } from "@/routes/teacher/_components/course-manage/CourseSettingsPanel";
import { LearningOutcomesPanel } from "@/routes/teacher/_components/course-manage/LearningOutcomesPanel";
import { ModuleAccordion } from "@/routes/teacher/_components/course-manage/ModuleAccordion";
import { AddModuleForm } from "@/routes/teacher/_components/course-manage/AddModuleForm";

/**
 * Teacher course-management page. Composes the settings + learning-outcomes
 * panels and the curriculum (a drag-sortable list of ModuleAccordion cards
 * with a quick-nav rail). All the heavy per-section UI lives in
 * `_components/course-manage/*`; this file owns the page layout, module
 * open/close persistence, and module-level drag reordering.
 */
export default function CourseManagePage() {
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

  return (
    <div className="space-y-6 pb-12">
      {/* Course Settings — the panel carries its own titled, collapsible
          header (icon + "Course Settings" + status summary), so an outer
          <h2> here just duplicated that title. Panel stands alone. */}
      <CourseSettingsPanel courseId={courseId} />

      {/* Learning Outcomes — same story: LearningOutcomesPanel self-titles,
          so no redundant section header. */}
      <LearningOutcomesPanel courseId={courseId} />

      {/* Curriculum */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-m3-primary" />
            <h2 className="text-base font-headline font-bold text-m3-primary">
              {t("teacher_common.section_curriculum")}
            </h2>
          </div>
          {/* Expand/collapse all (T#1/#3): fast way to open or compact every
              module at once. */}
          {modules.length > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAllModules(true)}
                className="text-xs font-medium text-m3-on-surface-variant hover:text-m3-primary transition-colors cursor-pointer px-2 py-1"
              >
                {t("teacher_common.expand_all")}
              </button>
              <span className="text-m3-outline-variant">·</span>
              <button
                type="button"
                onClick={() => setAllModules(false)}
                className="text-xs font-medium text-m3-on-surface-variant hover:text-m3-primary transition-colors cursor-pointer px-2 py-1"
              >
                {t("teacher_common.collapse_all")}
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-16 bg-m3-surface-container animate-pulse rounded-xl"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Horizontal quick-nav bar (T#3/#4): jump to any module + see its
                publish progress at a glance. Was a 220px left rail that squeezed
                the module cards; now a full-width horizontal chip row that
                scrolls on overflow, so modules get the full width. */}
            {modules.length > 1 && (
              <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-m3-outline-variant/40 pb-2">
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant/70">
                  {t("teacher_common.jump_to")}
                </span>
                {modules.map((module) => {
                  const st = (i: CourseContentItem) =>
                    i.target?.status ??
                    i.lesson?.status ??
                    i.quiz?.status ??
                    i.interview?.status;
                  const items = (module.items ?? []).filter(
                    (i) => st(i) !== undefined,
                  );
                  const pub = items.filter((i) => st(i) === "published").length;
                  const done = items.length > 0 && pub === items.length;
                  return (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => scrollToModule(module.id)}
                      className="flex shrink-0 items-center gap-1.5 rounded-full border border-m3-outline-variant/60 px-3 py-1 text-left text-xs text-m3-on-surface hover:border-m3-primary hover:bg-m3-surface-container transition-colors cursor-pointer group"
                    >
                      {done ? (
                        <CheckCheck className="h-3 w-3 shrink-0 text-emerald-600" />
                      ) : (
                        <CircleDot className="h-3 w-3 shrink-0 text-m3-outline-variant group-hover:text-m3-primary" />
                      )}
                      <span className="max-w-[12rem] truncate group-hover:text-m3-primary transition-colors">
                        {module.title}
                      </span>
                      {items.length > 0 && (
                        <span className="text-[10px] text-m3-on-surface-variant shrink-0">
                          {pub}/{items.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            )}

            <div className="space-y-3 min-w-0">
              {modules.map((module, idx) => (
                <ModuleAccordion
                  key={module.id}
                  module={module}
                  courseId={courseId}
                  open={!!openMap[module.id]}
                  onToggle={() => toggleModule(module.id)}
                  registerRef={registerModuleRef}
                  isDragOver={modDragOverIdx === idx}
                  isDragging={modDragIdx === idx}
                  onDragStart={(e) => {
                    setModDragIdx(idx);
                    const el = e.currentTarget as HTMLElement;
                    const rect = el.getBoundingClientRect();
                    e.dataTransfer.setDragImage(
                      el,
                      e.clientX - rect.left,
                      e.clientY - rect.top,
                    );
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setModDragOverIdx(idx);
                  }}
                  onDrop={() => handleModuleDrop(idx)}
                  onDragEnd={() => {
                    setModDragIdx(null);
                    setModDragOverIdx(null);
                  }}
                />
              ))}

              {addingModule ? (
                <AddModuleForm
                  courseId={courseId}
                  nextPosition={modules.length + 1}
                  onDone={() => setAddingModule(false)}
                />
              ) : (
                <Button
                  variant="outline"
                  className="w-full gap-2 text-sm"
                  onClick={() => setAddingModule(true)}
                >
                  <Plus className="h-4 w-4" />
                  {t("teacher_common.add_module")}
                </Button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Long page (settings + outcomes + every module) — floating jump back
          to the top once scrolled down. */}
      <ScrollToTop />
    </div>
  );
}
