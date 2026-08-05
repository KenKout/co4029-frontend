import { Link } from "@tanstack/react-router";
import { ChevronRight, GraduationCap } from "lucide-react";
import type { Course } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { EnrollmentStatusBadge } from "./CourseCard";

const ROW_GRADIENTS = [
  "from-blue-500 via-blue-700 to-blue-800",
  "from-blue-500 via-cyan-500 to-teal-500",
  "from-pink-500 via-rose-500 to-orange-500",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-amber-500 via-orange-500 to-red-500",
  "from-blue-500 via-blue-600 to-sky-500",
];

/**
 * Compact list-mode row for the catalogue: small thumbnail, title +
 * description + tags on the left, enrollment badge inline, chevron on the
 * right. Same link target as the card — the course landing page.
 */
export function CourseListRow({
  course,
  index,
  status,
}: {
  course: Course;
  index: number;
  status?: "active" | "completed";
}) {
  const gradientClass = ROW_GRADIENTS[index % ROW_GRADIENTS.length];

  return (
    <Link
      to="/courses/$slug"
      params={{ slug: course.slug }}
      className="group block"
    >
      <div className="flex items-center gap-4 p-3 rounded-xl ghost-border bg-card transition-colors group-hover:bg-m3-surface-container">
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
                "absolute inset-0 bg-gradient-to-br flex items-center justify-center opacity-25",
                gradientClass,
              )}
            >
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-headline font-semibold text-sm text-m3-on-surface truncate leading-snug">
              {course.title}
            </h3>
            {status && <EnrollmentStatusBadge status={status} />}
          </div>
          {course.description && (
            <p className="text-xs text-m3-on-surface-variant mt-0.5 line-clamp-1 leading-relaxed">
              {course.description}
            </p>
          )}
          {course.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
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

        <ChevronRight className="h-4 w-4 text-m3-outline shrink-0 transition-colors group-hover:text-m3-primary" />
      </div>
    </Link>
  );
}
