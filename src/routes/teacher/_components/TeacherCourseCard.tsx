import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Sparkles, GraduationCap, Clock, Users, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Course } from "@/lib/api/types/common";
import { cn } from "@/lib/utils";

// Same gradient palette as the public /courses cards, so the teacher-side
// cards read as the same product surface. Index-cycled for visual variety.
const CARD_GRADIENTS = [
  "from-blue-500 via-blue-700 to-blue-800",
  "from-blue-500 via-cyan-500 to-teal-500",
  "from-pink-500 via-rose-500 to-orange-500",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-amber-500 via-orange-500 to-red-500",
  "from-blue-500 via-blue-600 to-sky-500",
];

const STATUS_COLORS: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700",
  draft: "bg-amber-50 text-amber-700",
  archived: "bg-slate-100 text-slate-500",
};

/**
 * Teacher-side course card matching the public /courses card design: a
 * gradient banner (aspect-video) with the GraduationCap motif and AI Boost
 * badge, then a body with title + description. Retains the teacher-relevant
 * status badge (overlaid on the banner) and the level/duration meta footer.
 * The whole card is a single Link to the course management page.
 */
export function TeacherCourseCard({
  course,
  index,
  pendingReviewCount,
}: {
  course: Course;
  index: number;
  /**
   * Items awaiting this teacher's review in this course. Optional so other
   * callers (the courses list) can keep using the card unchanged.
   */
  pendingReviewCount?: number;
}) {
  const { t } = useTranslation();
  const gradientClass = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

  return (
    <div className="group relative flex h-full flex-col bg-card rounded-xl overflow-hidden shadow-editorial ghost-border transition-all duration-300 hover:-translate-y-1 hover:shadow-glass">
      {/* Stretched card link — covers the whole card for the primary click
          (course overview). Sits above the passive content but below the
          interactive students stat below, which layers over it (z-20). */}
      <Link
        to="/teacher/courses/$courseId"
        params={{ courseId: course.id }}
        aria-label={course.title}
        className="absolute inset-0 z-10"
      />
      <div className="flex h-full flex-col">
        {/* Banner — the uploaded thumbnail when present, else a gradient. */}
        <div className="relative aspect-video overflow-hidden shrink-0">
          {course.thumbnail_url ? (
            <img
              src={course.thumbnail_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br",
                gradientClass,
              )}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          {/* GraduationCap motif only on the gradient placeholder — a real
              thumbnail shouldn't have an icon overlaid on top of it. */}
          {!course.thumbnail_url && (
            <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-30 transition-opacity">
              <GraduationCap className="h-16 w-16 text-white" />
            </div>
          )}
          {/* AI Boost + status badges pinned bottom-right so an uploaded image
              doesn't obscure them at the top. */}
          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5">
            {/* Pending-review dot: lets the grid itself hint where attention is
                needed, so a teacher doesn't have to open the review list (or
                each course) to find out. Count is passed in by the dashboard —
                the card stays presentational. */}
            {pendingReviewCount !== undefined && pendingReviewCount > 0 && (
              <Badge
                title={t("teacher_dashboard.review.course_pending", {
                  count: pendingReviewCount,
                })}
                className="border-0 bg-amber-500 text-[10px] font-bold text-white gap-1"
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 rounded-full bg-white"
                />
                {pendingReviewCount}
              </Badge>
            )}
            <Badge className="bg-black/40 text-white border border-white/20 backdrop-blur-sm text-[10px] font-semibold tracking-wide">
              <Sparkles className="h-2.5 w-2.5 mr-1" />
              {t("courses_list.ai_boost")}
            </Badge>
            <Badge
              className={cn(
                "border-0 text-[10px] font-semibold",
                STATUS_COLORS[course.status] ?? "bg-slate-100 text-slate-500",
              )}
            >
              {t(`teacher_dashboard.status.${course.status}`, {
                defaultValue: course.status,
              })}
            </Badge>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 flex-1 flex flex-col">
          <div className="flex-1">
            <h3 className="font-headline font-semibold text-sm text-m3-on-surface line-clamp-2 leading-snug">
              {course.title}
            </h3>
            {/* Fixed-height description slot so cards keep a uniform height
                and the meta footer lines up across the grid. */}
            <p className="text-xs text-m3-on-surface-variant mt-1 line-clamp-2 leading-relaxed min-h-[2rem]">
              {course.description ?? ""}
            </p>
          </div>

          {/* Course-health line: active students + module count — gives the
              teacher an at-a-glance read of engagement + build progress. */}
          <div className="flex items-center gap-3 text-[11px] text-m3-on-surface-variant border-t border-m3-outline-variant/15 pt-2.5">
            {/* Students stat deep-links to the roster. Layered above the
                stretched card link (z-20) so it wins the click, and stops
                propagation so the card's overview link doesn't also fire. */}
            <Link
              to="/teacher/courses/$courseId/students"
              params={{ courseId: course.id }}
              onClick={(e) => e.stopPropagation()}
              title={t("teacher_courses_list.students_label", "Students")}
              className="relative z-20 flex items-center gap-1 rounded-md px-1 -mx-1 transition-colors hover:bg-m3-secondary/10 hover:text-m3-secondary"
            >
              <Users className="h-3.5 w-3.5 text-m3-secondary" />
              <span className="font-semibold text-m3-on-surface tabular-nums">
                {course.student_count ?? 0}
              </span>
            </Link>
            <span
              className="flex items-center gap-1"
              title={t("teacher_courses_list.modules_label", "Modules")}
            >
              <Layers className="h-3.5 w-3.5 text-m3-secondary" />
              <span className="font-semibold text-m3-on-surface tabular-nums">
                {course.module_count ?? 0}
              </span>
            </span>
          </div>

          {/* Meta footer: level + duration. */}
          <div className="flex items-center gap-2 text-[11px] text-m3-on-surface-variant">
            {course.level && (
              <span className="px-1.5 py-0.5 bg-m3-surface-container rounded-md font-medium">
                {t(`teacher_dashboard.level.${course.level}`, {
                  defaultValue: course.level,
                })}
              </span>
            )}
            {course.estimated_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {Math.round(course.estimated_minutes / 60)}h
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
