import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The two pre-content states of the per-student detail page — roster still
 * loading, and "this student is not on this roster". Extracted verbatim from
 * the former 659-line course-student-detail.tsx.
 */
export function StudentDetailLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-m3-secondary" />
    </div>
  );
}

export function StudentNotFound({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h2 className="text-2xl font-headline font-bold text-m3-on-surface">
        {t("teacher_course_student_detail.student_not_found")}
      </h2>
      <Link to="/teacher/courses/$courseId/students" params={{ courseId }}>
        <Button>{t("teacher_course_student_detail.back_to_students")}</Button>
      </Link>
    </div>
  );
}
