import { useNavigate } from "@tanstack/react-router";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs";
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
  isDirty,
  onNavigateWhileDirty,
}: {
  courseId: string;
  moduleId: string;
  courseTitle: string | undefined;
  courseModule: CourseContentModule | undefined;
  /** The live (possibly unsaved) title from the editor. */
  title: string;
  /** The persisted title, used while the editor is still syncing. */
  lessonTitle: string | undefined;
  isDirty?: boolean;
  onNavigateWhileDirty?: (action: () => void) => void;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const guardedClick = (item: Pick<BreadcrumbItem, "to" | "params">) =>
    isDirty && onNavigateWhileDirty && item.to
      ? (event: MouseEvent<HTMLAnchorElement>) => {
          event.preventDefault();
          onNavigateWhileDirty(() => {
            void navigate({
              to: item.to as never,
              params: (item.params ?? {}) as never,
            });
          });
        }
      : undefined;
  return (
    <Breadcrumbs
      items={[
        {
          label: t("teacher_common.breadcrumb_teaching"),
          to: "/teacher/courses",
          onClick: guardedClick({ to: "/teacher/courses" }),
        },
        {
          label: courseTitle ?? t("teacher_common.breadcrumb_course"),
          to: "/teacher/courses/$courseId",
          params: { courseId },
          onClick: guardedClick({
            to: "/teacher/courses/$courseId",
            params: { courseId },
          }),
        },
        ...(courseModule
          ? [
              {
                label: courseModule.title,
                to: "/teacher/courses/$courseId/modules/$moduleId",
                params: { courseId, moduleId },
                onClick: guardedClick({
                  to: "/teacher/courses/$courseId/modules/$moduleId",
                  params: { courseId, moduleId },
                }),
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
