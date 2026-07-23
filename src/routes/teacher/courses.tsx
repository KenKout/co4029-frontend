import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Plus, BookOpen, Clock, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  useTeacherCourseContent,
  useTeacherCourses,
} from "@/lib/api/hooks/teacher-courses";
import type { Course } from "@/lib/api/types/common";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700",
  draft: "bg-amber-50 text-amber-700",
  archived: "bg-slate-100 text-slate-500",
};

function ModuleChips({ courseId }: { courseId: string }) {
  const { data: content } = useTeacherCourseContent(courseId);
  const modules = content?.modules ?? [];
  if (modules.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {modules.slice(0, 3).map((m) => (
        <span
          key={m.id}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-m3-surface-container text-[11px] text-m3-on-surface-variant font-medium"
        >
          <ChevronRight className="h-3 w-3 opacity-50" />
          {m.title}
        </span>
      ))}
      {modules.length > 3 && (
        <span className="px-2 py-0.5 rounded-md bg-m3-surface-container text-[11px] text-m3-on-surface-variant">
          +{modules.length - 3} more
        </span>
      )}
    </div>
  );
}

function CourseCard({ course }: { course: Course }) {
  const totalMins = course.estimated_minutes ?? 0;
  const hours = totalMins ? Math.round(totalMins / 60) : null;

  return (
    <div className="group bg-card rounded-xl shadow-editorial ghost-border hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Top accent bar */}
      <div
        className={cn(
          "h-1 w-full",
          course.status === "published"
            ? "bg-gradient-to-r from-m3-primary to-m3-secondary"
            : "bg-m3-outline-variant",
        )}
      />
      <div className="p-5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <Link
            to="/teacher/courses/$courseId"
            params={{ courseId: course.id }}
            className="font-headline font-bold text-base text-m3-on-surface hover:text-m3-primary transition-colors leading-snug"
          >
            {course.title}
          </Link>
          <Badge
            className={cn(
              "text-[10px] font-semibold border-0 shrink-0 mt-0.5",
              STATUS_COLORS[course.status] ?? "bg-slate-100 text-slate-500",
            )}
          >
            {course.status}
          </Badge>
        </div>

        {/* Description */}
        {course.description && (
          <p className="text-xs text-m3-on-surface-variant line-clamp-2 leading-relaxed mb-3">
            {course.description}
          </p>
        )}

        {/* Module chips */}
        <ModuleChips courseId={course.id} />

        {/* Meta row */}
        <div className="flex items-center gap-4 mt-3 text-[11px] text-m3-on-surface-variant">
          {course.level && (
            <span className="px-1.5 py-0.5 bg-m3-surface-container rounded-md font-medium">
              {course.level}
            </span>
          )}
          {hours && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {hours}h
            </span>
          )}
        </div>

        {/* Action */}
        <div className="mt-4 flex justify-end">
          <Link
            to="/teacher/courses/$courseId"
            params={{ courseId: course.id }}
          >
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Manage
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
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
