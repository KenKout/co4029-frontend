import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

/**
 * Breadcrumb trail plus the back-arrow / title row at the top of the enrollment
 * screen. Rendered as a fragment so the two blocks stay direct siblings inside
 * the page container, exactly as they were before the split.
 */
export function PageHeader({
  courseId,
  courseTitle,
}: {
  courseId: string;
  courseTitle: string | undefined;
}) {
  const { t } = useTranslation();

  return (
    <>
      <div className="pt-4">
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
            { label: t("management_course_enrollments.breadcrumb.manage") },
          ]}
        />
      </div>

      <div className="flex items-center gap-3">
        <Link to="/teacher/courses/$courseId" params={{ courseId }}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-headline font-bold text-m3-on-surface truncate">
            {t("management_course_enrollments.header.title")}
          </h1>
          <p className="text-xs text-m3-on-surface-variant mt-0.5 truncate">
            {courseTitle ?? "…"}
          </p>
        </div>
      </div>
    </>
  );
}
