import type { CourseContentItem } from "@/lib/api/types/common";
import { AddContentPills } from "./AddContentPills";
import { ItemRow } from "./ItemRow";
import type { ItemReorderController } from "./use-item-reorder";

/**
 * The drag-to-reorder curriculum list plus its "add content" footer. Extracted
 * from the former 887-line `module-manage.tsx`; the drag handlers now come from
 * `useItemReorder` but fire in the same order as the former inline arrows.
 */
export function CurriculumItemsCard({
  sortedItems,
  courseId,
  moduleId,
  reorder,
  onDelete,
}: {
  sortedItems: CourseContentItem[];
  courseId: string;
  moduleId: string;
  reorder: ItemReorderController;
  onDelete: (item: CourseContentItem, title: string) => void;
}) {
  return (
    <div className="bg-m3-surface-container-low rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-m3-outline-variant/10 flex items-center gap-2">
        <h2 className="font-headline font-bold text-sm text-m3-on-surface flex-1">
          Curriculum Items
        </h2>
        <span className="text-xs text-m3-on-surface-variant">
          Drag to reorder
        </span>
      </div>

      <div className="p-4 space-y-1.5">
        {sortedItems.length === 0 && (
          <p className="text-sm text-m3-on-surface-variant text-center py-6">
            No items yet. Add one below.
          </p>
        )}
        {sortedItems.map((item, idx) => (
          <ItemRow
            key={item.id}
            item={item}
            courseId={courseId}
            isDragOver={reorder.dragOverIdx === idx}
            isDragging={reorder.dragSourceIdx === idx}
            onDragStart={(e) => reorder.startDrag(idx, e)}
            onDragOver={(e) => reorder.dragOver(idx, e)}
            onDrop={() => reorder.handleDrop(sortedItems, idx)}
            onDragEnd={reorder.endDrag}
            onDelete={(title) => onDelete(item, title)}
          />
        ))}

        <AddContentPills moduleId={moduleId} courseId={courseId} />
      </div>
    </div>
  );
}
