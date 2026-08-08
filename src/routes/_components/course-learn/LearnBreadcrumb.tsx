import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

/**
 * Courses / <course> / Learn [/ <lesson>] crumbs. In content view "Learn"
 * becomes a link back to the course-home summary and the active item's name is
 * the final crumb.
 */
export function LearnBreadcrumb({
  slug,
  courseTitle,
  showHome,
  onGoHome,
  activeTitle,
}: {
  slug: string;
  courseTitle: string;
  showHome: boolean;
  onGoHome: () => void;
  activeTitle: string | undefined;
}) {
  return (
    <nav className="flex items-center gap-2 text-xs text-m3-on-surface-variant mb-5">
      <Link to="/courses" className="hover:text-m3-primary transition-colors">
        Courses
      </Link>
      <span>/</span>
      <Link
        to="/courses/$slug"
        params={{ slug }}
        className="hover:text-m3-primary transition-colors truncate max-w-[160px]"
      >
        {courseTitle}
      </Link>
      <span>/</span>
      {showHome ? (
        <span className="text-m3-on-surface font-medium truncate">Learn</span>
      ) : (
        <>
          {/* In content view, "Learn" becomes a link back to the course-home
              summary and the active item's name is the final crumb. */}
          <Button variant="ghost"
            type="button"
            onClick={onGoHome}
            className="hover:text-m3-primary transition-colors cursor-pointer"
          >
            Learn
          </Button>
          <span>/</span>
          <span className="text-m3-on-surface font-medium truncate max-w-[200px]">
            {activeTitle}
          </span>
        </>
      )}
    </nav>
  );
}
