import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Plus, BookOpen, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useTeacherCourses } from "@/lib/api/hooks/teacher-courses";
import type { Course } from "@/lib/api/types/common";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700",
  draft: "bg-amber-50 text-amber-700",
  archived: "bg-slate-100 text-slate-500",
};

function CourseCard({ course }: { course: Course }) {
  const { t } = useTranslation();
  return (
    // Whole card is a single link, so the entire surface is the hover/click
    // target (matches the teacher dashboard card).
    <Link
      to="/teacher/courses/$courseId"
      params={{ courseId: course.id }}
      className="group block h-full"
    >
      <div className="flex h-full flex-col bg-card rounded-xl p-5 shadow-editorial ghost-border hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
        <div className="flex items-start justify-between gap-3">
          <h3 className="flex-1 min-w-0 font-headline font-semibold text-sm text-m3-on-surface line-clamp-2">
            {course.title}
          </h3>
          <Badge
            className={cn(
              "shrink-0 text-[10px] font-semibold border-0",
              STATUS_COLORS[course.status] ?? "bg-slate-100 text-slate-500",
            )}
          >
            {t(`teacher_dashboard.status.${course.status}`, {
              defaultValue: course.status,
            })}
          </Badge>
        </div>
        {/* Fixed-height description slot so cards with and without a
            description keep the same overall height and the meta row lines up
            across the grid. */}
        <p className="text-xs text-m3-on-surface-variant mt-1.5 line-clamp-2 min-h-[2rem]">
          {course.description ?? ""}
        </p>
        {/* Meta row pinned to the bottom via mt-auto so every card's footer
            aligns regardless of title/description length. */}
        <div className="mt-auto pt-3 flex items-center gap-2 text-[11px] text-m3-on-surface-variant">
          {course.level && (
            <span className="px-1.5 py-0.5 bg-m3-surface-container rounded-md font-medium">
              {t(`teacher_dashboard.level.${course.level}`, {
                defaultValue: course.level,
              })}
            </span>
          )}
          {course.estimated_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {Math.round(course.estimated_minutes / 60)}h
            </span>
          )}
          <span className="ml-auto text-m3-primary font-medium group-hover:underline">
            {t("teacher_dashboard.your_courses.manage")} &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function TeacherCoursesPage() {
  const { t } = useTranslation();
  const { data: courses = [], isLoading } = useTeacherCourses();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = courses.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const published = courses.filter((c) => c.status === "published").length;
  const draft = courses.filter((c) => c.status === "draft").length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-headline font-bold text-m3-on-surface">
            {t("teacher_courses_list.title")}
          </h1>
          <p className="text-sm text-m3-on-surface-variant mt-1">
            {t("teacher_courses_list.n_courses", { count: courses.length })}
            {published > 0 &&
              t("teacher_courses_list.published_suffix", { count: published })}
            {draft > 0 &&
              t("teacher_courses_list.draft_suffix", { count: draft })}
          </p>
        </div>
        <Link to="/teacher/courses/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {t("teacher_courses_list.new_course")}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-on-surface-variant" />
          <Input
            placeholder={t("teacher_common.search_courses")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "published", "draft", "archived"] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setStatusFilter(s)}
            >
              {t(`teacher_courses_list.filter_${s}`)}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 bg-m3-surface-container animate-pulse rounded-xl"
            />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
