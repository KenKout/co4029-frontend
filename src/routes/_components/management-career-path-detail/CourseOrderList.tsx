import { CourseInPathRow } from "./CourseInPathRow";
import { ReorderBanner } from "./ReorderBanner";
import type { CoursesTabController } from "./use-courses-tab";

/** Ordered list of attached courses, preceded by the unsaved-order banner. */
export function CourseOrderList({
  pathId,
  controller,
}: {
  pathId: string;
  controller: CoursesTabController;
}) {
  return (
    <div className="space-y-2">
      {controller.hasReorderChanges && (
        <ReorderBanner controller={controller} />
      )}
      {controller.rows.map((row, idx) => (
        <CourseInPathRow
          key={row.course_id}
          row={row}
          index={idx}
          pathId={pathId}
          controller={controller}
        />
      ))}
    </div>
  );
}
