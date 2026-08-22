import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CheckCircle2, GraduationCap, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Course } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const CARD_GRADIENTS = [
  "from-blue-500 via-blue-700 to-blue-800",
  "from-blue-500 via-cyan-500 to-teal-500",
  "from-pink-500 via-rose-500 to-orange-500",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-amber-500 via-orange-500 to-red-500",
  "from-blue-500 via-blue-600 to-sky-500",
];

/**
 * Enrollment-state badge shown on catalogue cards/rows (top-left over the
 * thumbnail on cards, inline next to the title in list rows). Only active
 * and completed enrollments get a badge — dropped/waitlisted and
 * unenrolled courses stay unmarked.
 */
export function EnrollmentStatusBadge({
  status,
}: {
  status: "active" | "completed";
}) {
  const { t } = useTranslation();
  return (
    <Badge
      className={cn(
        "border border-white/20 backdrop-blur-sm text-[10px] font-semibold tracking-wide text-white",
        status === "completed"
          ? "bg-emerald-600/90"
          : "bg-m3-primary/90",
      )}
    >
      {status === "completed" && <CheckCircle2 className="h-2.5 w-2.5" />}
      {status === "completed"
        ? t("courses_list.completed_badge")
        : t("courses_list.enrolled_badge")}
    </Badge>
  );
}

export function CourseCard({
  course,
  index,
  status,
}: {
  course: Course;
  index: number;
  status?: "active" | "completed";
}) {
  const { t } = useTranslation();
  const gradientClass = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

  return (
    <Link
      to="/courses/$slug"
      params={{ slug: course.slug }}
      className="group block"
    >
      <div className="bg-card rounded-xl overflow-hidden shadow-editorial ghost-border transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-glass h-full flex flex-col">
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
          {/* Enrollment badge — top-left so it never collides with the AI
              Boost badge at bottom-right. z-[5]: above the thumbnail content
              but below the sticky search bar (z-10), so badges never paint
              over it while scrolling. */}
          {status && (
            <div className="absolute top-3 left-3 z-[5]">
              <EnrollmentStatusBadge status={status} />
            </div>
          )}
          {/* AI Boost badge moved bottom-right so an uploaded image's top area
              stays clear (matches the teacher card). */}
          <Badge className="absolute bottom-3 right-3 z-[5] bg-black/40 text-white border border-white/20 backdrop-blur-sm text-[10px] font-semibold tracking-wide">
            <Sparkles className="h-2.5 w-2.5 mr-1" />
            {t("courses_list.ai_boost")}
          </Badge>
          {/* GraduationCap motif only on the gradient placeholder — a real
              thumbnail shouldn't have an icon overlaid on it. */}
          {!course.thumbnail_url && (
            <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-30 transition-opacity">
              <GraduationCap className="h-16 w-16 text-white" />
            </div>
          )}
        </div>

        <div className="p-4 space-y-3 flex-1 flex flex-col">
          <div className="flex-1">
            <h3 className="font-headline font-semibold text-sm text-m3-on-surface line-clamp-2 leading-snug">
              {course.title}
            </h3>
            {course.description && (
              <p className="text-xs text-m3-on-surface-variant mt-1 line-clamp-2 leading-relaxed">
                {course.description}
              </p>
            )}
          </div>

          {course.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {course.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 rounded-full bg-m3-secondary/10 text-m3-secondary text-[10px] font-semibold"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function CourseSkeletonCard() {
  return (
    <div className="rounded-xl ghost-border overflow-hidden">
      <Skeleton className="aspect-video rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
