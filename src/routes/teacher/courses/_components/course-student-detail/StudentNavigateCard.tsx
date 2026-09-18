import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";

/**
 * Sidebar "Navigate" card — back to the roster, or up to the course structure.
 * Extracted verbatim from the former 659-line course-student-detail.tsx.
 */
export function StudentNavigateCard({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  return (
    <div className="bg-m3-surface-container-lowest rounded-xl p-5 ghost-border shadow-editorial">
      <p className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-wider mb-3">
        {t("teacher_course_student_detail.navigate")}
      </p>
      <Link
        to="/teacher/courses/$courseId/students"
        params={{ courseId }}
        className="flex items-center justify-between p-3 rounded-xl hover:bg-m3-surface-container-low transition-colors group cursor-pointer"
      >
        <span className="text-sm font-medium text-m3-on-surface">
          {t("teacher_course_student_detail.back_to_roster")}
        </span>
        <ChevronRight className="h-4 w-4 text-m3-on-surface-variant opacity-60 group-hover:opacity-100 transition-opacity" />
      </Link>
      <Link
        to="/teacher/courses/$courseId"
        params={{ courseId }}
        className="flex items-center justify-between p-3 rounded-xl hover:bg-m3-surface-container-low transition-colors group cursor-pointer"
      >
        <span className="text-sm font-medium text-m3-on-surface">
          {t("teacher_course_student_detail.course_structure")}
        </span>
        <ChevronRight className="h-4 w-4 text-m3-on-surface-variant opacity-60 group-hover:opacity-100 transition-opacity" />
      </Link>
    </div>
  );
}
