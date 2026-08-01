import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { CourseSettingsPanel } from "@/routes/teacher/_components/course-manage/CourseSettingsPanel";
import { LearningOutcomesPanel } from "@/routes/teacher/_components/course-manage/LearningOutcomesPanel";

import { CurriculumSection } from "./_components/course-manage/CurriculumSection";
import { useCourseManageController } from "./_components/course-manage/use-course-manage-controller";

/**
 * Teacher course-management page. Composes the settings + learning-outcomes
 * panels and the curriculum (a drag-sortable list of ModuleAccordion cards
 * with a quick-nav rail). All the heavy per-section UI lives in
 * `@/routes/teacher/_components/course-manage/*`; the page layout, module
 * open/close persistence and module-level drag reordering now live in
 * `_components/course-manage/` next to this file.
 */
export default function CourseManagePage() {
  const controller = useCourseManageController();
  const { courseId } = controller;

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
      <CurriculumSection controller={controller} />

      {/* Long page (settings + outcomes + every module) — floating jump back
          to the top once scrolled down. */}
      <ScrollToTop />
    </div>
  );
}
