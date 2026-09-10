import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChevronRight, Clock, GraduationCap, Layers, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Course } from "@/lib/api/types/common";
import { cn } from "@/lib/utils";
import { TEACHER_COURSE_STATUS_TOKENS } from "@/lib/status-tokens";

// Same palette the teacher card cycles through — one course paints the same
// colour whether the teacher is in card or list mode.
const ROW_GRADIENTS = [
  "from-blue-500 via-blue-700 to-blue-800",
  "from-blue-500 via-cyan-500 to-teal-500",
  "from-pink-500 via-rose-500 to-orange-500",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-amber-500 via-orange-500 to-red-500",
  "from-blue-500 via-blue-600 to-sky-500",
];

/**
 * Compact list-mode row for the teacher Courses index: small thumbnail (or
 * index-cycled gradient), title + status badge + description, the same
 * students/modules/duration meta the card shows, chevron on the right.
 * Same link target as the card — the course management page.
 */
export function TeacherCourseListRow({
  course,
  index,
}: {
  course: Course;
  index: number;
}) {
  const { t } = useTranslation();
  const gradientClass = ROW_GRADIENTS[index % ROW_GRADIENTS.length];

  return (
    <Link
      to="/teacher/courses/$courseId"
      params={{ courseId: course.id }}
      className="group block"
    >
      <div className="flex items-center gap-4 rounded-xl bg-card p-3 transition-colors ghost-border group-hover:bg-m3-surface-container">
        <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg">
          {course.thumbnail_url ? (
            <img
              src={course.thumbnail_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center bg-gradient-to-br",
                gradientClass,
              )}
            >
              <GraduationCap className="h-6 w-6 text-white/70" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-headline text-sm font-semibold leading-snug text-m3-on-surface">
              {course.title}
            </h3>
            <Badge
              className={cn(
                "shrink-0 border-0 text-[10px] font-semibold",
                TEACHER_COURSE_STATUS_TOKENS[course.status] ??
                  "bg-slate-100 text-slate-500",
              )}
            >
              {t(`teacher_dashboard.status.${course.status}`, {
                defaultValue: course.status,
              })}
            </Badge>
          </div>
          {course.description && (
            <p className="mt-0.5 line-clamp-1 text-xs leading-relaxed text-m3-on-surface-variant">
              {course.description}
            </p>
          )}
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-m3-on-surface-variant">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3 text-m3-secondary" />
              <span className="font-semibold tabular-nums text-m3-on-surface">
                {course.student_count ?? 0}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3 text-m3-secondary" />
              <span className="font-semibold tabular-nums text-m3-on-surface">
                {course.module_count ?? 0}
              </span>
            </span>
            {course.estimated_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {Math.round(course.estimated_minutes / 60)}h
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-m3-outline transition-colors group-hover:text-m3-primary" />
      </div>
    </Link>
  );
}
