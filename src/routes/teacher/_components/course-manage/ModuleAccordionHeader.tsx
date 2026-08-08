import { Link } from "@tanstack/react-router";
import { ChevronDown, ExternalLink, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CourseContentModule } from "@/lib/api/types/common";
import { cn } from "@/lib/utils";
import { ModuleHeaderActions } from "./ModuleHeaderActions";
import { ModulePublishControls } from "./ModulePublishControls";
import { ModuleStatusToggle } from "./ModuleStatusToggle";
import type { ModuleAccordionController } from "./use-module-accordion";
import type { TranslateFn } from "./types";

/**
 * The module card's header row: drag grip, inline-editable title, edit link,
 * status toggle, publish progress + publish-all, meta counts, the rename /
 * duplicate buttons and the expand chevron. Moved verbatim out of
 * `ModuleAccordion`.
 */
export function ModuleAccordionHeader({
  module,
  courseId,
  open,
  onToggle,
  ctl,
  t,
}: {
  module: CourseContentModule;
  courseId: string;
  open: boolean;
  onToggle: () => void;
  ctl: ModuleAccordionController;
  t: TranslateFn;
}) {
  const {
    stats,
    editingTitle,
    setEditingTitle,
    titleDraft,
    setTitleDraft,
    titleInputRef,
    updateModule,
    duplicateModule,
    setModuleDragEnabled,
    publishingAll,
    handleDuplicateModule,
    startEditTitle,
    saveTitle,
    toggleStatus,
    handlePublishAll,
  } = ctl;

  return (
    <div
      className={cn(
        "group w-full flex items-center gap-3 p-4 text-left cursor-pointer transition-colors",
        "bg-m3-surface-container-low hover:bg-m3-surface-container",
      )}
      onClick={() => !editingTitle && onToggle()}
    >
      {/* Drag handle — dragging armed only while grabbing this grip so the
          title / edit / publish controls in the header stay clickable. */}
      <Button variant="ghost"
        type="button"
        aria-label={t("teacher_common.drag_to_reorder")}
        onMouseDown={() => setModuleDragEnabled(true)}
        onMouseUp={() => setModuleDragEnabled(false)}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 cursor-grab active:cursor-grabbing touch-none p-0.5 -m-0.5 text-m3-outline-variant hover:text-m3-on-surface-variant h-auto whitespace-normal"
      >
        <GripVertical className="h-4 w-4" />
      </Button>

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

      <ModuleStatusToggle
        module={module}
        updateModule={updateModule}
        onToggleStatus={toggleStatus}
        t={t}
      />

      <ModulePublishControls
        stats={stats}
        publishingAll={publishingAll}
        onPublishAll={handlePublishAll}
        t={t}
      />

      {/* Meta counts */}
      <span className="text-[11px] text-m3-on-surface-variant hidden md:block shrink-0">
        {stats.lessonCount}L{stats.quizCount > 0 && ` · ${stats.quizCount}Q`}
        {stats.interviewCount > 0 && ` · ${stats.interviewCount}I`}
      </span>

      <ModuleHeaderActions
        editingTitle={editingTitle}
        duplicateModule={duplicateModule}
        onStartEditTitle={startEditTitle}
        onDuplicate={handleDuplicateModule}
        t={t}
      />

      {/* Chevron expand */}
      <Button variant="ghost" type="button" onClick={onToggle} className="shrink-0">
        <ChevronDown
          className={cn(
            "h-4 w-4 text-m3-on-surface-variant transition-transform duration-300",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
      </Button>
    </div>
  );
}
