import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Breadcrumbs,
} from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";

/**
 * Courses / <course> / Learn [/ <lesson>] crumbs on the learn page.
 *
 * Uses the shared `Breadcrumbs` component for the standard view so the learn
 * page matches every other page's breadcrumb style. One custom bit: in
 * content view ("showHome" false) the middle "Learn" crumb must be a *button*
 * back to the course summary (a client-side view switch, not a route), and
 * the active item's name is the final crumb — Breadcrumbs only renders links
 * or text, so that case composes the same markup by hand, mirroring the
 * shared component's exact classes.
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
  const { t } = useTranslation();

  if (showHome) {
    return (
      <Breadcrumbs
        items={[
          { label: t("course_detail.breadcrumb_courses"), to: "/courses" },
          { label: courseTitle, to: "/courses/$slug", params: { slug } },
          { label: "Learn" },
        ]}
      />
    );
  }

  // Content view: Courses / <course> / [Learn button] / <lesson title>.
  return (
    <nav
      aria-label={t("common.breadcrumb_aria")}
      data-slot="breadcrumbs"
      className="mb-4 flex flex-wrap items-center gap-2 text-sm text-m3-on-surface-variant"
    >
      <Link
        to="/courses"
        className="rounded-md px-1 hover:text-m3-primary focus-visible:outline-2 focus-visible:outline-m3-primary transition-colors"
      >
        {t("course_detail.breadcrumb_courses")}
      </Link>
      <ChevronRight className="size-4 text-m3-outline" aria-hidden="true" />
      <Link
        to="/courses/$slug"
        params={{ slug }}
        className="rounded-md px-1 hover:text-m3-primary focus-visible:outline-2 focus-visible:outline-m3-primary transition-colors"
      >
        {courseTitle}
      </Link>
      <ChevronRight className="size-4 text-m3-outline" aria-hidden="true" />
      {/* Back to the course-home summary — a view switch, not a route. */}
      <Button
        variant="ghost"
        type="button"
        onClick={onGoHome}
        className="h-auto cursor-pointer rounded-md px-1 py-0 text-sm font-normal text-m3-on-surface-variant hover:text-m3-primary"
      >
        Learn
      </Button>
      <ChevronRight className="size-4 text-m3-outline" aria-hidden="true" />
      <span aria-current="page" className="font-medium text-m3-on-surface">
        {activeTitle}
      </span>
    </nav>
  );
}
