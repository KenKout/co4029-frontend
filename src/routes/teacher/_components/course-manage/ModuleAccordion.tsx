import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { apiPatch, apiPost } from "@/lib/api/client";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  GripVertical,
  Pencil,
  Loader2,
  Check,
  ExternalLink,
  Copy,
  CheckCheck,
  CircleDot,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useUpdateModule,
  useReorderModuleItems,
  useDuplicateModule,
} from "@/lib/api/hooks/teacher-courses";
import type {
  CourseContentItem,
  CourseContentModule,
} from "@/lib/api/types/common";
import { cn } from "@/lib/utils";
import { ModuleItemRow } from "./ModuleItemRow";
import { AddLessonPills } from "./AddLessonPills";

/**
 * A collapsible module card: inline-editable title, publish/status toggle,
 * publish-progress chip, publish-all, duplicate, and a drag-sortable list of
 * its items (ModuleItemRow) followed by the add-item pills (AddLessonPills).
 * Module dragging is armed only while the header grip is held so the header
 * controls stay clickable.
 */
export function ModuleAccordion({
  module,
  courseId,
  open,
  onToggle,
  registerRef,
  isDragOver,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  module: CourseContentModule;
  courseId: string;
  open: boolean;
  onToggle: () => void;
  /** Registers this module's DOM node so the quick-nav rail can scroll to it. */
  registerRef: (id: string, el: HTMLDivElement | null) => void;
  isDragOver: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const { t } = useTranslation();
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

  const allItemsSorted = [...(module.items ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  const lessonCount = (module.items ?? []).filter(
    (i) => i.item_type === "lesson",
  ).length;
  const quizCount = (module.items ?? []).filter(
    (i) => i.item_type === "quiz",
  ).length;
  const interviewCount = (module.items ?? []).filter(
    (i) => i.item_type === "interview",
  ).length;

  // Publish progress (T#2 + #1): how many items are live. Drives the header
  // "N/M published" chip and the "Publish all" action. An item's status lives
  // on its target (lesson/quiz/interview); items with no status are ignored.
  function itemStatus(i: CourseContentItem): string | undefined {
    // Teacher payload carries status on `target`; the typed lesson/quiz/
    // interview fields are learner-payload-only. Check target first.
    return (
      i.target?.status ??
      i.lesson?.status ??
      i.quiz?.status ??
      i.interview?.status
    );
  }
  const statusedItems = (module.items ?? []).filter(
    (i) => itemStatus(i) !== undefined,
  );
  const publishedCount = statusedItems.filter(
    (i) => itemStatus(i) === "published",
  ).length;
  const draftItems = statusedItems.filter((i) => itemStatus(i) !== "published");
  const allPublished =
    statusedItems.length > 0 && publishedCount === statusedItems.length;

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
  // parallel. Each item type has its own route, so we branch per item. The
  // per-row hooks can't be reused here (hooks can't live in a loop), so we PATCH
  // /POST directly via the same endpoints those hooks call. Best-effort with a
  // summary toast; the content query is invalidated once at the end.
  const [publishingAll, setPublishingAll] = useState(false);
  async function handlePublishAll(e: React.MouseEvent) {
    e.stopPropagation();
    if (draftItems.length === 0 || publishingAll) return;
    setPublishingAll(true);
    const results = await Promise.allSettled(
      draftItems.map((i) => {
        if (i.item_type === "lesson" && i.lesson_id) {
          return apiPatch(`/teacher/lessons/${i.lesson_id}`, {
            status: "published",
          });
        }
        if (i.item_type === "quiz" && i.quiz_id) {
          return apiPost(`/teacher/quizzes/${i.quiz_id}/publish`);
        }
        if (i.item_type === "interview" && i.interview_config_id) {
          return apiPost(
            `/teacher/interview-configs/${i.interview_config_id}/publish`,
          );
        }
        return Promise.reject(new Error("unpublishable item"));
      }),
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

  return (
    <div
      ref={(el) => registerRef(module.id, el)}
      id={`module-${module.id}`}
      draggable={moduleDragEnabled}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={() => {
        setModuleDragEnabled(false);
        onDragEnd();
      }}
      className={cn(
        "flex flex-col rounded-xl border-l-4 overflow-hidden scroll-mt-24 transition-all",
        isDragging ? "opacity-40" : "",
        isDragOver ? "ring-2 ring-m3-primary/40 shadow-sm" : "",
        open ? "border-m3-primary" : "border-m3-outline-variant",
      )}
    >
      {/* Header row */}
      <div
        className={cn(
          "group w-full flex items-center gap-3 p-4 text-left cursor-pointer transition-colors",
          "bg-m3-surface-container-low hover:bg-m3-surface-container",
        )}
        onClick={() => !editingTitle && onToggle()}
      >
        {/* Drag handle — dragging armed only while grabbing this grip so the
            title / edit / publish controls in the header stay clickable. */}
        <button
          type="button"
          aria-label={t("teacher_common.drag_to_reorder")}
          onMouseDown={() => setModuleDragEnabled(true)}
          onMouseUp={() => setModuleDragEnabled(false)}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 cursor-grab active:cursor-grabbing touch-none p-0.5 -m-0.5 text-m3-outline-variant hover:text-m3-on-surface-variant"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Title — editable inline */}
        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") {
                setEditingTitle(false);
                setTitleDraft(module.title);
              }
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 font-headline font-semibold text-sm text-m3-on-surface bg-transparent border-b border-m3-secondary outline-none py-0.5"
          />
        ) : (
          <span className="flex-1 font-headline font-semibold text-sm text-m3-on-surface transition-colors group-hover:text-m3-primary">
            {updateModule.isPending &&
            updateModule.variables &&
            "title" in updateModule.variables
              ? ((updateModule.variables as { title?: string }).title ??
                module.title)
              : module.title}
          </span>
        )}

        <Link
          to="/teacher/courses/$courseId/modules/$moduleId"
          params={{ courseId, moduleId: module.id }}
          title={t("teacher_common.edit_module")}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        >
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-7 px-2.5 text-xs border-m3-outline-variant/30"
          >
            <ExternalLink className="h-3 w-3" />
            <span className="hidden sm:inline">
              {t("teacher_common.edit_button")}
            </span>
          </Button>
        </Link>

        {/* Status badge — click to toggle */}
        <button
          type="button"
          title={t("teacher_common.mark_module_as", {
            status: t(
              `teacher_dashboard.status.${module.status === "published" ? "draft" : "published"}`,
            ),
          })}
          onClick={toggleStatus}
          disabled={updateModule.isPending}
          className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full border-0 transition-colors cursor-pointer",
            module.status === "published"
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              : "bg-amber-50 text-amber-700 hover:bg-amber-100",
          )}
        >
          {updateModule.isPending
            ? "…"
            : module.status
              ? t(`teacher_dashboard.status.${module.status}`)
              : module.status}
        </button>

        {/* Publish progress chip (T#1 + #2): fills the wasted middle space with
            useful signal — how many items are live. Green when all published. */}
        {statusedItems.length > 0 && (
          <span
            className={cn(
              "hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
              allPublished
                ? "bg-emerald-100 text-emerald-700"
                : "bg-m3-surface-container-high text-m3-on-surface-variant",
            )}
            title={t("teacher_common.publish_progress", {
              published: publishedCount,
              total: statusedItems.length,
            })}
          >
            {allPublished ? (
              <CheckCheck className="h-2.5 w-2.5" />
            ) : (
              <CircleDot className="h-2.5 w-2.5" />
            )}
            {publishedCount}/{statusedItems.length}
          </span>
        )}

        {/* Publish-all (T#2): one click publishes every draft item in the
            module. Only shown when there's at least one draft to publish. */}
        {draftItems.length > 0 && (
          <button
            type="button"
            onClick={handlePublishAll}
            disabled={publishingAll}
            title={t("teacher_common.publish_all", {
              count: draftItems.length,
            })}
            className="shrink-0 hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 hover:bg-emerald-100 hover:text-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            {publishingAll ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <CheckCheck className="h-2.5 w-2.5" />
            )}
            {t("teacher_common.publish_all", { count: draftItems.length })}
          </button>
        )}

        {/* Meta counts */}
        <span className="text-[11px] text-m3-on-surface-variant hidden md:block shrink-0">
          {lessonCount}L{quizCount > 0 && ` · ${quizCount}Q`}
          {interviewCount > 0 && ` · ${interviewCount}I`}
        </span>

        {/* Pencil to edit title */}
        <button
          type="button"
          title={t("teacher_common.rename_module")}
          onClick={startEditTitle}
          className="shrink-0 p-1 rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary transition-colors"
        >
          {editingTitle ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Pencil className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Duplicate module — deep-clones the module + all items as a new draft */}
        <button
          type="button"
          title={t("teacher_common.duplicate_module", "Duplicate module")}
          onClick={handleDuplicateModule}
          disabled={duplicateModule.isPending}
          className="shrink-0 p-1 rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary transition-colors disabled:opacity-50"
        >
          {duplicateModule.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Chevron expand */}
        <button type="button" onClick={onToggle} className="shrink-0">
          <ChevronDown
            className={cn(
              "h-4 w-4 text-m3-on-surface-variant transition-transform duration-300",
              open ? "rotate-0" : "-rotate-90",
            )}
          />
        </button>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden min-h-0">
          <div className="border-t border-m3-outline-variant bg-card">
            <div className="p-4 flex flex-col gap-1">
              {allItemsSorted.length === 0 && (
                <p className="text-xs text-m3-on-surface-variant py-2 pl-1">
                  {t("teacher_common.no_items_yet")}
                </p>
              )}
              {allItemsSorted.map((item, idx) => (
                <ModuleItemRow
                  key={item.id}
                  item={item}
                  courseId={courseId}
                  isDragOver={dragOverIdx === idx}
                  isDragging={dragSourceIdx === idx}
                  onDragStart={(e) => {
                    setDragSourceIdx(idx);
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
                    setDragOverIdx(idx);
                  }}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={() => {
                    setDragSourceIdx(null);
                    setDragOverIdx(null);
                  }}
                />
              ))}
              <AddLessonPills
                moduleId={module.id}
                courseId={courseId}
                itemCount={(module.items ?? []).length}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
