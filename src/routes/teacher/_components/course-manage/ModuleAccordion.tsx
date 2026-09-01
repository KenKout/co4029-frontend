import { useTranslation } from "react-i18next";
import type { CourseContentModule } from "@/lib/api/types/common";
import { cn } from "@/lib/utils";
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
  const ctl = useModuleAccordion({ module, courseId, t });
  const { moduleDragEnabled, setModuleDragEnabled } = ctl;

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
  );
}
