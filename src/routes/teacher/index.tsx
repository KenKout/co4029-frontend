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
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { useTeacherCourses } from "@/lib/api/hooks/teacher-courses";
import { TeacherCourseCard } from "@/routes/teacher/_components/TeacherCourseCard";

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
          <h1 className="text-2xl font-headline font-bold text-m3-primary">
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
          <div className="grid gap-5 mt-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl ghost-border overflow-hidden">
                <div className="aspect-video bg-m3-surface-container animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 bg-m3-surface-container animate-pulse rounded" />
                  <div className="h-3 w-1/2 bg-m3-surface-container animate-pulse rounded" />
                </div>
              </div>
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
          <div className="grid gap-5 mt-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.slice(0, 6).map((course, i) => (
              <TeacherCourseCard key={course.id} course={course} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
