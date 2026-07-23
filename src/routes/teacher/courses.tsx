import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Plus, BookOpen, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTeacherCourses } from "@/lib/api/hooks/teacher-courses";
import { TeacherCourseCard } from "@/routes/teacher/_components/TeacherCourseCard";

type StatusFilter = "all" | "published" | "draft" | "archived";
type SortKey = "recent" | "oldest" | "title";

export default function TeacherCoursesPage() {
  const { t } = useTranslation();
  const { data: courses = [], isLoading } = useTeacherCourses();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("recent");

  // Per-status counts drive both the subtitle and the filter-pill badges, so
  // a teacher sees the breakdown of each bucket before clicking into it.
  const counts = useMemo(
    () => ({
      all: courses.length,
      published: courses.filter((c) => c.status === "published").length,
      draft: courses.filter((c) => c.status === "draft").length,
      archived: courses.filter((c) => c.status === "archived").length,
    }),
    [courses],
  );

  const filtered = useMemo(() => {
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
  }, [courses, search, statusFilter, sort]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-headline font-bold text-m3-primary">
            {t("teacher_courses_list.title")}
          </h1>
          <p className="text-sm text-m3-on-surface-variant mt-1">
            {t("teacher_courses_list.n_courses", { count: courses.length })}
            {counts.published > 0 &&
              t("teacher_courses_list.published_suffix", {
                count: counts.published,
              })}
            {counts.draft > 0 &&
              t("teacher_courses_list.draft_suffix", { count: counts.draft })}
          </p>
        </div>
        <Link to="/teacher/courses/new">
          <Button
            size="sm"
            className="gap-2 transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            {t("teacher_courses_list.new_course")}
          </Button>
        </Link>
      </div>

      {/* Toolbar: search (own row) + status segmented control + sort */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-on-surface-variant" />
          <Input
            placeholder={t("teacher_common.search_courses")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSearch("");
            }}
            className="pl-9 pr-9 h-10 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label={t("teacher_courses_list.clear_search", "Clear search")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-m3-on-surface-variant transition-colors hover:bg-m3-surface-container hover:text-m3-on-surface"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status segmented control — one container, per-status counts. */}
          <div className="inline-flex items-center gap-1 rounded-xl bg-m3-surface-container-low p-1">
            {(["all", "published", "draft", "archived"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  statusFilter === s
                    ? "bg-card text-m3-primary shadow-sm"
                    : "text-m3-on-surface-variant hover:bg-card/60 hover:text-m3-on-surface",
                )}
              >
                {t(`teacher_courses_list.filter_${s}`)}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                    statusFilter === s
                      ? "bg-m3-primary-fixed text-m3-primary"
                      : "bg-m3-surface-container text-m3-on-surface-variant",
                  )}
                >
                  {counts[s]}
                </span>
              </button>
            ))}
          </div>

          {/* Sort */}
          <label className="flex items-center gap-2 text-xs text-m3-on-surface-variant">
            {t("teacher_courses_list.sort_label", "Sort")}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="cursor-pointer rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-m3-on-surface transition-colors hover:border-m3-primary/50 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="recent">
                {t("teacher_courses_list.sort_recent", "Newest first")}
              </option>
              <option value="oldest">
                {t("teacher_courses_list.sort_oldest", "Oldest first")}
              </option>
              <option value="title">
                {t("teacher_courses_list.sort_title", "Title (A–Z)")}
              </option>
            </select>
          </label>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl ghost-border overflow-hidden">
              <div className="aspect-video bg-m3-surface-container animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 bg-m3-surface-container animate-pulse rounded" />
                <div className="h-3 w-1/2 bg-m3-surface-container animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-m3-on-surface-variant">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">
            {search
              ? t("teacher_courses_list.no_match")
              : t("teacher_courses_list.no_courses_yet")}
          </p>
          {!search && (
            <Link to="/teacher/courses/new">
              <Button size="sm" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                {t("teacher_courses_list.create_course")}
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Result count — orients the teacher once the list is filtered. */}
          <p className="text-xs text-m3-on-surface-variant">
            {t("teacher_courses_list.showing_count", {
              count: filtered.length,
              total: courses.length,
              defaultValue: "Showing {{count}} of {{total}}",
            })}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((course, i) => (
              <TeacherCourseCard key={course.id} course={course} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
