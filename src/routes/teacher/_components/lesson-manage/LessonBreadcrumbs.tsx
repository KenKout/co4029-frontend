import { useTranslation } from "react-i18next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import type { CourseContentModule } from "@/lib/api/types/common";

/**
 * Teaching › Course › Module › Lesson trail above the lesson editor. The module
 * crumb is omitted when the lesson has no resolvable parent module.
 */
export function LessonBreadcrumbs({
  courseId,
  moduleId,
  courseTitle,
  courseModule,
  title,
  lessonTitle,
}: {
  courseId: string;
  moduleId: string;
  courseTitle: string | undefined;
  courseModule: CourseContentModule | undefined;
  /** The live (possibly unsaved) title from the editor. */
  title: string;
  /** The persisted title, used while the editor is still syncing. */
  lessonTitle: string | undefined;
}) {
  const { t } = useTranslation();
  return (
    <Breadcrumbs
      items={[
        {
          label: t("teacher_common.breadcrumb_teaching"),
          to: "/teacher/courses",
        },
        {
          label: courseTitle ?? t("teacher_common.breadcrumb_course"),
          to: "/teacher/courses/$courseId",
          params: { courseId },
        },
        ...(courseModule
          ? [
              {
                label: courseModule.title,
                to: "/teacher/courses/$courseId/modules/$moduleId",
                params: { courseId, moduleId },
              },
            ]
          : []),
        {
          label: title || lessonTitle || t("teacher_common.lesson_fallback"),
        },
      ]}
    />
  );
}
