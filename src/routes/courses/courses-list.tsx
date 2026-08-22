import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SectionHeader } from "@/components/ui/section-header";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { useCourses } from "@/lib/api/hooks/courses";
import { useMyEnrollments } from "@/lib/api/hooks/me";
import {
  CoursesGrid,
  CoursesLoadError,
  CoursesSkeletonGrid,
} from "@/routes/courses/_components/courses-list/CoursesGrid";
import {
  CoursesSearchBar,
  type CourseScope,
  type CourseViewMode,
} from "@/routes/courses/_components/courses-list/CoursesSearchBar";

const VIEW_MODE_KEY = "courses:viewMode";

/**
 * Public course catalogue.
 *
 * The card/row renderers, sticky search bar and grid live in
 * `_components/courses-list/`; this file owns the queries and the client-side
 * filters:
 *
 * - search: title/description/slug
 * - scope: All / Enrolled / Completed — ``/me/enrollments`` supplies the
 *   per-course status so students can instantly see what they're in and can
 *   jump back to finished courses for review/practice (enrolled students —
 *   including completed ones — keep read access per the enrollment gate).
 * - view mode: card grid or compact list rows (persisted per browser).
 */
export default function CoursesListPage() {
  const { t } = useTranslation();
  const {
    items,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useCourses(20);

  // Enrolled/completed course ids → status. 404/errors just mean "no
  // badges"; the catalogue itself stays public.
  const { data: enrollments } = useMyEnrollments();

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<CourseScope>("all");
  const [viewMode, setViewMode] = useState<CourseViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return saved === "list" ? "list" : "card";
  });

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  const enrollmentsByCourse = useMemo(() => {
    const map = new Map<string, "active" | "completed">();
    for (const e of enrollments ?? []) {
      if (e.status === "active" || e.status === "completed") {
        map.set(e.course_id, e.status);
      }
    }
    return map;
  }, [enrollments]);

  const scopeFiltered = useMemo(() => {
    if (scope === "all") return items;
    return items.filter((c) => {
      const status = enrollmentsByCourse.get(c.id);
      if (!status) return false;
      return scope === "enrolled" ? true : status === "completed";
    });
  }, [items, scope, enrollmentsByCourse]);

  const filtered = useMemo(() => {
    if (!query) return scopeFiltered;
    const q = query.toLowerCase();
    return scopeFiltered.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q),
    );
  }, [scopeFiltered, query]);

  // Whether the student has any course of the current scope at all (before
  // search) — drives the scope-specific empty state.
  const hasScopeCourses = useMemo(() => {
    if (scope === "all") return items.length > 0;
    return items.some((c) => {
      const status = enrollmentsByCourse.get(c.id);
      return status ? (scope === "enrolled" ? true : status === "completed") : false;
    });
  }, [items, scope, enrollmentsByCourse]);

  function clearAll() {
    setQuery("");
    setScope("all");
  }

  const statusOf = useMemo(
    () => (courseId: string) => enrollmentsByCourse.get(courseId),
    [enrollmentsByCourse],
  );

  return (
    <div className="relative min-h-screen pb-28">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="pt-2">
          <div className="flex items-center gap-3 mb-2">
            <AIInsightChip pulse>{t("courses_list.ai_chip")}</AIInsightChip>
          </div>
          <h1 className="font-headline font-black text-4xl sm:text-5xl text-m3-on-surface leading-none tracking-tight">
            {t("courses_list.title")}
          </h1>
          <p className="mt-3 text-m3-on-surface-variant text-base sm:text-lg max-w-xl">
            {t("courses_list.intro")}
          </p>
        </header>

        <CoursesSearchBar
          query={query}
          setQuery={setQuery}
          clearFilters={clearAll}
          isLoading={isLoading}
          shownCount={filtered.length}
          totalCount={scope === "all" ? items.length : scopeFiltered.length}
          scope={scope}
          setScope={setScope}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />

        <section className="space-y-5 pb-4">
          <SectionHeader
            title={t("courses_list.section_title")}
            subtitle={t("courses_list.section_subtitle")}
          />

          {isError && <CoursesLoadError error={error} />}

          {isLoading && <CoursesSkeletonGrid viewMode={viewMode} />}

          {!isLoading && !isError && (
            <CoursesGrid
              filtered={filtered}
              query={query}
              totalCount={items.length}
              clearFilters={clearAll}
              hasNextPage={hasNextPage}
              fetchNextPage={fetchNextPage}
              isFetchingNextPage={isFetchingNextPage}
              viewMode={viewMode}
              statusOf={statusOf}
              scope={scope}
              hasScopeCourses={hasScopeCourses}
              clearScope={() => setScope("all")}
            />
          )}
        </section>
      </div>
    </div>
  );
}
