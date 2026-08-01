import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Back link in the lesson action bar — targets the parent module when the
 * lesson has one, otherwise the course.
 */
export function LessonBackLink({
  courseId,
  moduleId,
  isDirty,
  onBackWhileDirty,
}: {
  courseId: string;
  moduleId: string;
  isDirty: boolean;
  /** Invoked (instead of navigating) when Back is clicked while dirty. */
  onBackWhileDirty: () => void;
}) {
  const { t } = useTranslation();
  return (
    /* Back to the parent module/course. Intercepted so unsaved lesson
       edits prompt first — a plain <Link> would navigate straight away and
       silently drop the draft. */
    <Link
      to={
        moduleId
          ? "/teacher/courses/$courseId/modules/$moduleId"
          : "/teacher/courses/$courseId"
      }
      params={moduleId ? { courseId, moduleId } : { courseId }}
      onClick={(e) => {
        if (!isDirty) return; // let the Link do its normal thing
        e.preventDefault();
        onBackWhileDirty();
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2.5 gap-2 text-m3-on-surface-variant"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">
          {t("teacher_common.back_to_course")}
        </span>
      </Button>
    </Link>
  );
}
