import type { Course } from "@/lib/api/types/common";

import type { SortKey, StatusCounts, StatusFilter } from "./types";

/**
 * Pure list helpers of the teacher Courses index, moved verbatim out of the
 * former 234-line courses.tsx.
 */

/**
 * Per-status counts drive both the subtitle and the filter-pill badges, so
 * a teacher sees the breakdown of each bucket before clicking into it.
 */
export function countCoursesByStatus(courses: Course[]): StatusCounts {
  return {
    all: courses.length,
    published: courses.filter((c) => c.status === "published").length,
    draft: courses.filter((c) => c.status === "draft").length,
    archived: courses.filter((c) => c.status === "archived").length,
  };
}

export function filterAndSortCourses(
  courses: Course[],
  criteria: { search: string; statusFilter: StatusFilter; sort: SortKey },
): Course[] {
  const { search, statusFilter, sort } = criteria;
  const q = search.trim().toLowerCase();
  const rows = courses.filter((c) => {
    const matchSearch = !q || c.title.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const sorted = [...rows];
  sorted.sort((a, b) => {
    if (sort === "title") return a.title.localeCompare(b.title);
    const at = new Date(a.created_at).getTime();
    const bt = new Date(b.created_at).getTime();
    return sort === "oldest" ? at - bt : bt - at;
  });
  return sorted;
}
