import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useTeacherCourses } from "@/lib/api/hooks/teacher-courses";
import type { Course } from "@/lib/api/types/common";

import { countCoursesByStatus, filterAndSortCourses } from "./helpers";
import type { SortKey, StatusCounts, StatusFilter } from "./types";

/**
 * State and derived values of the teacher Courses index, extracted from the
 * former 234-line courses.tsx. The hook sequence is unchanged — translation, the
 * courses query, the three `useState` calls, then the `counts` and `filtered`
 * memos with their original dependency arrays. `t` is handed back so the page
 * keeps exactly the hooks it had before the split.
 */
export interface TeacherCoursesController {
  t: ReturnType<typeof useTranslation>["t"];
  courses: Course[];
  isLoading: boolean;
  search: string;
  setSearch: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  sort: SortKey;
  setSort: (value: SortKey) => void;
  counts: StatusCounts;
  filtered: Course[];
}

export function useTeacherCoursesController(): TeacherCoursesController {
  const { t } = useTranslation();
  const { data: courses = [], isLoading } = useTeacherCourses();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("recent");

  const counts = useMemo(() => countCoursesByStatus(courses), [courses]);

  const filtered = useMemo(
    () => filterAndSortCourses(courses, { search, statusFilter, sort }),
    [courses, search, statusFilter, sort],
  );

  return {
    t,
    courses,
    isLoading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sort,
    setSort,
    counts,
    filtered,
  };
}
