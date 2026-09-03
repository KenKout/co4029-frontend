import { useTranslation } from "react-i18next";
import { AlertCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InfiniteList } from "@/components/ui/InfiniteList";
import type { Course } from "@/lib/api/types";
import { CourseCard, CourseSkeletonCard } from "./CourseCard";
import { CourseListRow } from "./CourseListRow";

/** The course list failed to load. */
export function CoursesLoadError({ error }: { error: unknown }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={AlertCircle}
      title={t("courses_list.load_failed_title")}
      description={
        error instanceof Error
          ? error.message
          : t("courses_list.load_failed_body")
      }
      cta={
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="cursor-pointer"
        >
          {t("courses_list.retry")}
        </Button>
      }
    />
  );
}

/** First-load placeholder — card skeletons (grid mode) or row skeletons. */
export function CoursesSkeletonGrid({ viewMode }: { viewMode?: "card" | "list" }) {
  if (viewMode === "list") {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-3 rounded-xl ghost-border"
          >
            <div className="h-16 w-28 shrink-0 rounded-lg bg-m3-surface-container animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/2 rounded-full bg-m3-surface-container animate-pulse" />
              <div className="h-2 w-1/3 rounded-full bg-m3-surface-container animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <CourseSkeletonCard key={i} />
      ))}
    </div>
  );
}

/**
 * No courses at all, none matching the current search, or (with a scope
 * active) none enrolled/completed yet — each with its own copy + CTA.
 */
function CoursesEmptyState({
  query,
  totalCount,
  clearFilters,
  scope,
  hasScopeCourses,
  clearScope,
}: {
  query: string;
  totalCount: number;
  clearFilters: () => void;
  scope: "all" | "enrolled" | "completed";
  hasScopeCourses: boolean;
  clearScope: () => void;
}) {
  const { t } = useTranslation();

  // Scope empty (enrolled/completed tab with zero courses of that kind):
  // distinct copy + "browse all" CTA instead of the generic search empty.
  if (scope !== "all" && !hasScopeCourses) {
    const completed = scope === "completed";
    return (
      <EmptyState
        icon={Search}
        title={
          completed
            ? t("courses_list.empty_no_completed_title")
            : t("courses_list.empty_no_enrolled_title")
        }
        description={
          completed
            ? t("courses_list.empty_no_completed_body")
            : t("courses_list.empty_no_enrolled_body")
        }
        cta={
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={clearScope}
          >
            {t("courses_list.browse_all")}
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      icon={Search}
      title={
        totalCount === 0
          ? t("courses_list.empty_no_courses_title")
          : t("courses_list.empty_no_match_title")
      }
      description={
        totalCount === 0
          ? t("courses_list.empty_no_courses_body")
          : t("courses_list.empty_no_match_body")
      }
      cta={
        query ? (
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={clearFilters}
          >
            {t("courses_list.clear_search")}
          </Button>
        ) : undefined
      }
    />
  );
}

/**
 * The paginated course list. ``viewMode`` switches between the card grid
 * and compact list rows; ``statusOf`` maps a course id to the student's
 * enrollment state so cards/rows can show Enrolled/Completed badges.
 * Search + scope filter run client-side over what's already fetched,
 * which is why `hasNextPage` is forced false while a filter is active.
 */
export function CoursesGrid({
  filtered,
  query,
  totalCount,
  clearFilters,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  viewMode,
  statusOf,
  scope,
  hasScopeCourses,
  clearScope,
}: {
  filtered: Course[];
  query: string;
  totalCount: number;
  clearFilters: () => void;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  viewMode: "card" | "list";
  statusOf: (courseId: string) => "active" | "completed" | undefined;
  scope: "all" | "enrolled" | "completed";
  hasScopeCourses: boolean;
  clearScope: () => void;
}) {
  const filtering = Boolean(query) || scope !== "all";
  return (
    <InfiniteList<Course>
      items={filtered}
      hasNextPage={filtering ? false : hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={isFetchingNextPage}
      keyOf={(c) => c.id}
      className={
        viewMode === "card"
          ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
          : "space-y-3"
      }
      empty={
        <CoursesEmptyState
          query={query}
          totalCount={totalCount}
          clearFilters={clearFilters}
          scope={scope}
          hasScopeCourses={hasScopeCourses}
          clearScope={clearScope}
        />
      }
      renderItem={(course) =>
        viewMode === "card" ? (
          <CourseCard
            course={course}
            status={statusOf(course.id)}
          />
        ) : (
          <CourseListRow
            course={course}
            status={statusOf(course.id)}
          />
        )
      }
    />
  );
}
