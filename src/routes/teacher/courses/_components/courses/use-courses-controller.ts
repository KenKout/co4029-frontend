import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useTeacherCourses } from "@/lib/api/hooks/teacher-courses";
import type { Course } from "@/lib/api/types/common";

import { countCoursesByStatus, filterAndSortCourses } from "./helpers";
import type { CourseViewMode, SortKey, StatusCounts, StatusFilter } from "./types";

const VIEW_MODE_KEY = "teacher_courses:viewMode";
const STATUS_FILTER_KEY = "teacher_courses:statusFilter";
const SORT_KEY = "teacher_courses:sort";

const STATUS_FILTERS: readonly StatusFilter[] = [
  "all",
  "published",
  "draft",
  "archived",
];
const SORT_KEYS: readonly SortKey[] = ["recent", "oldest", "title"];

function loadViewMode(): CourseViewMode {
  try {
    return localStorage.getItem(VIEW_MODE_KEY) === "list" ? "list" : "card";
  } catch {
    return "card";
  }
}

/** Persisted status filter — falls back to "all" on junk/private mode. */
function loadStatusFilter(): StatusFilter {
  try {
    const raw = localStorage.getItem(STATUS_FILTER_KEY) as StatusFilter | null;
    return raw && STATUS_FILTERS.includes(raw) ? raw : "all";
  } catch {
    return "all";
  }
}

/** Persisted sort — falls back to "recent" on junk/private mode. */
function loadSort(): SortKey {
  try {
    const raw = localStorage.getItem(SORT_KEY) as SortKey | null;
    return raw && SORT_KEYS.includes(raw) ? raw : "recent";
  } catch {
    return "recent";
  }
}

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
  viewMode: CourseViewMode;
  setViewMode: (mode: CourseViewMode) => void;
  counts: StatusCounts;
  filtered: Course[];
}

export function useTeacherCoursesController(): TeacherCoursesController {
  const { t } = useTranslation();
  const { data: courses = [], isLoading } = useTeacherCourses();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>(loadStatusFilter);
  const [sort, setSort] = useState<SortKey>(loadSort);
  const [viewMode, setViewMode] = useState<CourseViewMode>(loadViewMode);

  // Toolbar preferences survive reloads; private-mode storage failures are
  // swallowed — the session just won't remember them.
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
      localStorage.setItem(STATUS_FILTER_KEY, statusFilter);
      localStorage.setItem(SORT_KEY, sort);
    } catch {
      // private mode — preferences just won't persist
    }
  }, [viewMode, statusFilter, sort]);

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
    viewMode,
    setViewMode,
    counts,
    filtered,
  };
}
