import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Plus, BookOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTeacherCourses } from "@/lib/api/hooks/teacher-courses";
import { TeacherCourseCard } from "@/routes/teacher/_components/TeacherCourseCard";

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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl ghost-border overflow-hidden"
            >
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((course, i) => (
            <TeacherCourseCard key={course.id} course={course} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
