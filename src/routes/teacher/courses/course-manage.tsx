import { CourseSettingsPanel } from "@/routes/teacher/_components/course-manage/CourseSettingsPanel";
import { SectionHeader } from "@/components/ui/section-header";
import { useTranslation } from "react-i18next";

import { CurriculumSection } from "./_components/course-manage/CurriculumSection";
import { useCourseManageController } from "./_components/course-manage/use-course-manage-controller";
import { CourseTabPanel } from "./_components/CourseTabPanel";

/**
 * Teacher course-management page: the curriculum, plus the slice of course
 * settings a teacher owns.
 *
 * The teacher's job here is CONTENT. `CourseSettingsPanel` runs in
 * `scope="teacher"`, which leaves description, the study-time estimate and the
 * teacher's own contact details — the six fields `course.update` actually
 * grants. Identity (title/slug), lifecycle (status), delivery policy (level,
 * caps, thumbnail) and the learning outcomes moved to the dept course page's
 * Settings tab, because their permissions were always manager-side
 * (`course.delete` / `learning_outcome.manage`): saving them from here could
 * only ever 403.
 */
export default function CourseManagePage() {
  const { t } = useTranslation();
  const controller = useCourseManageController();
  const { courseId } = controller;

  return (
    <CourseTabPanel>
      <SectionHeader
        title={t("teacher_common.section_curriculum")}
        subtitle={t("teacher_common.curriculum_workspace_subtitle")}
      />

      {/* Curriculum is the primary job of this tab. */}
      <CurriculumSection controller={controller} />

      {/* Course Settings — the panel carries its own titled, collapsible
          header (icon + "Course Settings" + status summary), so an outer
          <h2> here just duplicated that title. Panel stands alone. */}
      <CourseSettingsPanel courseId={courseId} scope="teacher" />
    </CourseTabPanel>
  );
}
