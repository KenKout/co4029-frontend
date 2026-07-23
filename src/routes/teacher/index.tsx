import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Users,
  FileText,
  Sparkles,
  Plus,
  ArrowRight,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { useTeacherCourses } from "@/lib/api/hooks/teacher-courses";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700",
  draft: "bg-amber-50 text-amber-700",
  archived: "bg-slate-100 text-slate-500",
};

export default function TeacherDashboard() {
  const { t } = useTranslation();
  const { data: courses = [], isLoading } = useTeacherCourses();

  const published = courses.filter((c) => c.status === "published").length;
  const draft = courses.filter((c) => c.status === "draft").length;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-headline font-bold text-m3-on-surface">
            {t("teacher_dashboard.title")}
          </h1>
          <p className="text-sm text-m3-on-surface-variant mt-1">
            {t("teacher_dashboard.subtitle")}
          </p>
        </div>
        <Link to="/teacher/courses/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {t("teacher_dashboard.new_course")}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={t("teacher_dashboard.stats.total_courses")}
          value={courses.length}
          icon={BookOpen}
        />
        <StatCard
          label={t("teacher_dashboard.stats.published")}
          value={published}
          icon={CheckCircle}
        />
        <StatCard
          label={t("teacher_dashboard.stats.drafts")}
          value={draft}
          icon={Clock}
        />
        <StatCard
          label={t("teacher_dashboard.stats.ai_enabled")}
          value={courses.length}
          icon={Sparkles}
        />
      </div>

      {/* Course list */}
      <div>
        <SectionHeader
          title={t("teacher_dashboard.your_courses.title")}
          subtitle={t("teacher_dashboard.your_courses.subtitle")}
          action={
            <Link to="/teacher/courses">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                {t("teacher_dashboard.your_courses.view_all")}{" "}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          }
        />

        {isLoading ? (
          <div className="grid gap-4 mt-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 bg-m3-surface-container animate-pulse rounded-xl"
              />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="mt-8 text-center text-m3-on-surface-variant">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">
              {t("teacher_dashboard.your_courses.no_courses_yet")}
            </p>
            <p className="text-xs mt-1">
              {t("teacher_dashboard.your_courses.create_first")}
            </p>
            <Link to="/teacher/courses/new">
              <Button size="sm" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                {t("teacher_dashboard.your_courses.create_course")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 mt-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.slice(0, 6).map((course) => (
              <Link
                key={course.id}
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
                        STATUS_COLORS[course.status] ??
                          "bg-slate-100 text-slate-500",
                      )}
                    >
                      {t(`teacher_dashboard.status.${course.status}`, {
                        defaultValue: course.status,
                      })}
                    </Badge>
                  </div>
                  {/* Fixed-height description slot so cards with and without a
                      description keep the same overall height and the meta row
                      lines up across the grid. */}
                  <p className="text-xs text-m3-on-surface-variant mt-1.5 line-clamp-2 min-h-[2rem]">
                    {course.description ?? ""}
                  </p>
                  {/* Meta row pinned to the bottom via mt-auto so every card's
                      footer aligns regardless of title/description length. */}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
