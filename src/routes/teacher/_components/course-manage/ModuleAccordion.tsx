import { useTranslation } from "react-i18next";
import type { CourseContentModule } from "@/lib/api/types/common";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ModuleAccordionHeader } from "./ModuleAccordionHeader";
import { ModuleItemsList } from "./ModuleItemsList";
import { useModuleAccordion } from "./use-module-accordion";

/**
 * A collapsible module card: inline-editable title, publish/status toggle,
 * publish-progress chip, publish-all, duplicate, and a drag-sortable list of
 * its items (ModuleItemRow) followed by the add-item pills (AddLessonPills).
 * Module dragging is armed only while the header grip is held so the header
 * controls stay clickable.
 *
 * Previously a single 414-line / complexity-32 function. Its state and handlers
 * now live in `use-module-accordion.ts`, its item tallies in `helpers.ts`, and
 * the header row / expanded body are their own components; every expression is
 * carried over unchanged.
 */
export function ModuleAccordion({
  module,
  courseId,
  courseStatus,
  index,
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
  courseStatus: string;
  /** 0-based order in the course, rendered as the module's number badge. */
  index: number;
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
  const ctl = useModuleAccordion({ module, courseId, courseStatus, t });
  const { moduleDragEnabled, setModuleDragEnabled } = ctl;

  return (
    <>
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
        <ModuleAccordionHeader
          module={module}
          courseId={courseId}
          index={index}
          open={open}
          onToggle={onToggle}
          ctl={ctl}
          t={t}
        />

        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-in-out",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden min-h-0">
            <div className="border-t border-m3-outline-variant bg-card">
              <ModuleItemsList
                module={module}
                courseId={courseId}
                ctl={ctl}
                t={t}
              />
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={ctl.statusConfirm !== null}
        onOpenChange={(open) => {
          if (!open) ctl.setStatusConfirm(null);
        }}
        title={
          ctl.statusConfirm === "published"
            ? t("teacher_common.publish_module_title", "Publish this module?")
            : t("teacher_common.archive_module_title", "Archive this module?")
        }
        description={t(
          ctl.statusConfirm === "published"
            ? "teacher_common.publish_module_body"
            : "teacher_common.archive_module_body",
          ctl.statusConfirm === "published"
            ? "This will make the module visible to students. Continue?"
            : "The module will be hidden from students and no new attempts can start. In-progress attempts can still be completed, and historical progress is preserved. This cannot be undone.",
        )}
        confirmLabel={
          ctl.statusConfirm === "published"
            ? t("teacher_common.publish", "Publish")
            : t("teacher_common.archive", "Archive")
        }
        cancelLabel={t("common.cancel")}
        confirmVariant={ctl.statusConfirm === "archived" ? "destructive" : "default"}
        isPending={ctl.updateModule.isPending}
        onConfirm={ctl.confirmStatusChange}
      />
      <ConfirmDialog
        open={ctl.duplicateConfirm}
        onOpenChange={ctl.setDuplicateConfirm}
        title={t("teacher_common.duplicate_module_title", "Duplicate this module?")}
        description={t(
          "teacher_common.duplicate_module_body",
          "A new draft module and draft copies of its content will be created. Continue?",
        )}
        confirmLabel={t("teacher_common.duplicate", "Duplicate")}
        cancelLabel={t("common.cancel")}
        confirmVariant="default"
        onConfirm={ctl.confirmDuplicateModule}
        isPending={ctl.duplicateModule.isPending}
      />
      <ConfirmDialog
        open={ctl.deleteConfirm}
        onOpenChange={ctl.setDeleteConfirm}
        title={t("teacher_common.delete_module_title", "Delete this draft module?")}
        description={t(
          "teacher_common.delete_module_body",
          "The draft module will be removed from this curriculum. Its lesson, quiz, and interview content will be kept but no longer pinned to this module.",
        )}
        confirmLabel={t("teacher_common.delete_module_confirm", "Delete module")}
        cancelLabel={t("common.cancel")}
        confirmVariant="destructive"
        onConfirm={ctl.confirmDeleteModule}
        isPending={ctl.deleteModule.isPending}
      />
    </>
  );
}
