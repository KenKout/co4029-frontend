import { PageSkeleton } from "@/components/ui/page-skeleton";

import { CurriculumHeader } from "./CurriculumHeader";
import { ModuleList } from "./ModuleList";
import { ModuleQuickNav } from "./ModuleQuickNav";
import type { CourseManageController } from "./use-course-manage-controller";

/**
 * Curriculum section — heading, then either the loading skeleton or the
 * quick-nav rail plus the module list. Extracted verbatim from the former
 * 255-line course-manage.tsx.
 */
export function CurriculumSection({
  controller,
}: {
  controller: CourseManageController;
}) {
  const { isLoading, modules } = controller;
  return (
    <section className="space-y-2">
      <CurriculumHeader controller={controller} />

      {isLoading ? (
        <PageSkeleton rows={2} />
      ) : (
        <div className="space-y-3">
          {modules.length > 1 && <ModuleQuickNav controller={controller} />}

          <ModuleList controller={controller} />
        </div>
      )}
    </section>
  );
}
