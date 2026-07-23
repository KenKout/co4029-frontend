import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Sparkles, GraduationCap, Clock } from "lucide-react";
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
}: {
  course: Course;
  index: number;
}) {
  const { t } = useTranslation();
  const gradientClass = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

  return (
    <Link
      to="/teacher/courses/$courseId"
      params={{ courseId: course.id }}
      className="group block h-full"
    >
      <div className="flex h-full flex-col bg-card rounded-xl overflow-hidden shadow-editorial ghost-border transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-glass">
        {/* Gradient banner */}
        <div className="relative aspect-video overflow-hidden shrink-0">
          <div
            className={cn("absolute inset-0 bg-gradient-to-br", gradientClass)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <Badge className="absolute top-3 left-3 z-10 bg-black/40 text-white border border-white/20 backdrop-blur-sm text-[10px] font-semibold tracking-wide">
            <Sparkles className="h-2.5 w-2.5 mr-1" />
            {t("courses_list.ai_boost")}
          </Badge>
          {/* Status badge — teacher-relevant, overlaid top-right. */}
          <Badge
            className={cn(
              "absolute top-3 right-3 z-10 border-0 text-[10px] font-semibold",
              STATUS_COLORS[course.status] ?? "bg-slate-100 text-slate-500",
            )}
          >
            {t(`teacher_dashboard.status.${course.status}`, {
              defaultValue: course.status,
            })}
          </Badge>
          <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-30 transition-opacity">
            <GraduationCap className="h-16 w-16 text-white" />
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
    </Link>
  );
}
