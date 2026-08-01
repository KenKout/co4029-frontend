import { useTranslation } from "react-i18next";
import { AlertCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InfiniteList } from "@/components/ui/InfiniteList";
import type { Course } from "@/lib/api/types";
import { CourseCard, CourseSkeletonCard } from "./CourseCard";

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

/** First-load placeholder grid. */
export function CoursesSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <CourseSkeletonCard key={i} />
      ))}
    </div>
  );
}

/** No courses at all, or none matching the current search. */
function CoursesEmptyState({
  query,
  totalCount,
  clearFilters,
}: {
  query: string;
  totalCount: number;
  clearFilters: () => void;
}) {
  const { t } = useTranslation();
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
 * The paginated course grid. Search disables infinite loading (the filter runs
 * client-side over what's already fetched), which is why `hasNextPage` is
 * forced false while a query is active.
 */
export function CoursesGrid({
  filtered,
  query,
  totalCount,
  clearFilters,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
}: {
  filtered: Course[];
  query: string;
  totalCount: number;
  clearFilters: () => void;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
}) {
  return (
    <InfiniteList<Course>
      items={filtered}
      hasNextPage={query ? false : hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={isFetchingNextPage}
      keyOf={(c) => c.id}
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
      empty={
        <CoursesEmptyState
          query={query}
          totalCount={totalCount}
          clearFilters={clearFilters}
        />
      }
      renderItem={(course, i) => <CourseCard course={course} index={i} />}
    />
  );
}
