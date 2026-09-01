import type { CourseContentModule } from "@/lib/api/types/common";
import { AddLessonPills } from "./AddLessonPills";
import { ModuleItemRow } from "./ModuleItemRow";
import type { ModuleAccordionController } from "./use-module-accordion";
import type { TranslateFn } from "./types";

/**
 * The module card's expanded body: the drag-sortable list of its items
 * (`ModuleItemRow`) followed by the add-item pills (`AddLessonPills`). Moved
 * verbatim out of `ModuleAccordion`.
 */
export function ModuleItemsList({
  module,
  courseId,
  ctl,
  t,
}: {
  module: CourseContentModule;
  courseId: string;
  ctl: ModuleAccordionController;
  t: TranslateFn;
}) {
  const {
    stats,
    dragSourceIdx,
    setDragSourceIdx,
    dragOverIdx,
    setDragOverIdx,
    handleDrop,
  } = ctl;
  const { allItemsSorted } = stats;

  return (
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
          index={idx}
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
  );
}
