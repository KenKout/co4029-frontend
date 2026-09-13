import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, GraduationCap } from "lucide-react";
import { slugGradient } from "@/routes/courses/_components/course-detail/helpers";
import { cn } from "@/lib/utils";
import { EnrollmentStatusBadge } from "./CourseCard";

/**
 * The MINIMUM a course needs to render as a list row.
 *
 * Deliberately not `Course`: the career-path projection
 * (`CareerPathCoursePublic`) carries only ids, slug, title and required-ness,
 * and demanding the full catalogue shape would have forced either a second
 * near-identical row component or a fake object with empty tags. A real
 * `Course` satisfies this structurally, so the catalogue passes one unchanged.
 */
export interface CourseRowSummary {
  slug: string;
  title: string;
  description?: string | null;
  tags?: { id: string; name: string }[];
  thumbnail_url?: string | null;
}

/**
 * Compact list-mode row: small thumbnail, title + description + tags on the
 * left, enrollment badge inline, chevron on the right. Links to the course
 * landing page.
 *
 * Shared by the course catalogue and the career-path pages so a course looks
 * the same wherever it is listed. The career path supplies fewer fields — its
 * API has no description, tags or thumbnail — so those sections simply do not
 * render; the shell, the slug-derived placeholder colour and the hover
 * behaviour stay identical.
 */
export function CourseListRow({
  course,
  status,
  leading,
  meta,
}: {
  course: CourseRowSummary;
  status?: "active" | "completed";
  /** Rendered before the thumbnail — the career path's stage sequence number. */
  leading?: ReactNode;
  /** Rendered under the title — required/optional, progress, and the like. */
  meta?: ReactNode;
}) {
  // Placeholder gradient derived from the course slug, so the same course
  // paints the same colour on the catalogue, dashboard and landing page.
  const gradientClass = slugGradient(course.slug);

  return (
    <Link
      to="/courses/$slug"
      params={{ slug: course.slug }}
      className="group block"
    >
      <div className="flex items-center gap-4 p-3 rounded-xl ghost-border bg-card transition-colors group-hover:bg-m3-surface-container">
        {leading}
        <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg">
          {course.thumbnail_url ? (
            <img
              src={course.thumbnail_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            /* Full-opacity gradient — a washed-out variant would read as a
               different colour from the card / landing-hero placeholder for
               the same course. */
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br flex items-center justify-center",
                gradientClass,
              )}
            >
              <GraduationCap className="h-6 w-6 text-white/70" />
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
          {course.tags && course.tags.length > 0 && (
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
          {meta}
        </div>

        <ChevronRight className="h-4 w-4 text-m3-outline shrink-0 transition-colors group-hover:text-m3-primary" />
      </div>
    </Link>
  );
}
