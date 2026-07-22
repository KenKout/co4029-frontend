import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Users, ChevronRight, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTeacherCourses } from "@/lib/api/hooks/teacher-courses";
import type { Course } from "@/lib/api/types/common";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700",
  draft: "bg-amber-50 text-amber-700",
  archived: "bg-slate-100 text-slate-500",
};

/**
 * Course-agnostic "Students" hub. Gives the sidebar a landing target (every
 * per-course student/enrollment page needs a courseId, so the nav can't
 * deep-link directly). Lists the teacher's courses; each card opens that
 * course's roster, where "Manage enrollments" (add / bulk / invite codes)
 * lives.
 */
export default function TeacherStudentsHubPage() {
  const { t } = useTranslation();
  const { data: courses, isLoading } = useTeacherCourses();

  return (
    <div className="max-w-5xl mx-auto pb-16 space-y-6">
      <div className="pt-4">
        <span className="text-m3-secondary font-headline font-bold text-xs tracking-widest uppercase">
          {t("teacher_students_hub.eyebrow")}
        </span>
        <h1 className="font-headline font-extrabold text-3xl sm:text-4xl text-m3-primary tracking-tight leading-tight mt-1">
          {t("teacher_students_hub.title")}
        </h1>
        <p className="text-m3-on-surface-variant text-sm mt-1">
          {t("teacher_students_hub.subtitle")}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 bg-m3-surface-container animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : !courses || courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-m3-on-surface-variant">
          <BookOpen className="h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">
            {t("teacher_students_hub.empty")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {courses.map((course: Course) => (
            <Link
              key={course.id}
              to="/teacher/courses/$courseId/students"
              params={{ courseId: course.id }}
              className="group bg-card rounded-xl shadow-editorial ghost-border hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 p-5 flex items-center gap-4"
            >
              <div className="w-11 h-11 rounded-xl bg-m3-primary-fixed flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-m3-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-headline font-bold text-base text-m3-on-surface truncate group-hover:text-m3-primary transition-colors">
                    {course.title}
                  </p>
                  <Badge
                    className={cn(
                      "text-[10px] font-semibold border-0 shrink-0",
                      STATUS_COLORS[course.status] ??
                        "bg-slate-100 text-slate-500",
                    )}
                  >
                    {course.status}
                  </Badge>
                </div>
                <p className="text-xs text-m3-on-surface-variant mt-0.5">
                  {t("teacher_students_hub.manage_cta")}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-m3-on-surface-variant group-hover:text-m3-primary transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
