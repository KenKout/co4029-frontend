import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Back link in the lesson action bar — returns to the course page, which is
 * where the lesson was opened from.
 */
export function LessonBackLink({
  courseId,
  isDirty,
  onBackWhileDirty,
}: {
  courseId: string;
  isDirty: boolean;
  /** Invoked (instead of navigating) when Back is clicked while dirty. */
  onBackWhileDirty: () => void;
}) {
  const { t } = useTranslation();
  return (
    /* Back to the course. The label says "back to course" and that is where
       teachers came from — lessons are opened from the course page's
       curriculum accordion, so the owning module page was never on the way.
       Intercepted so unsaved lesson edits prompt first — a plain <Link> would
       navigate straight away and silently drop the draft. */
    <Link
      to="/teacher/courses/$courseId"
      params={{ courseId }}
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
