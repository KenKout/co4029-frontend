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
  FileEdit,
  ClipboardCheck,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  useTeacherCourses,
  useTeacherDashboardStats,
} from "@/lib/api/hooks/teacher-courses";
import { TeacherCourseCard } from "@/routes/teacher/_components/TeacherCourseCard";

export default function TeacherDashboard() {
  const { t } = useTranslation();
  const { data: courses = [], isLoading } = useTeacherCourses();
  const { data: stats } = useTeacherDashboardStats();

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

      {/* Actionable widgets — only render when there's something to act on,
          so the dashboard stays a launchpad rather than showing empty zeros.
          Each deep-links into the relevant workflow. */}
      {stats &&
        (stats.draft_courses > 0 ||
          stats.ungraded_quizzes > 0 ||
          stats.pending_interviews > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.ungraded_quizzes > 0 && (
              <ActionWidget
                icon={ClipboardCheck}
                count={stats.ungraded_quizzes}
                label={t(
                  "teacher_dashboard.actions.ungraded_quizzes",
                  "quiz attempts to grade",
                )}
                tone="amber"
              />
            )}
            {stats.pending_interviews > 0 && (
              <ActionWidget
                icon={MessageSquare}
                count={stats.pending_interviews}
                label={t(
                  "teacher_dashboard.actions.pending_interviews",
                  "interviews awaiting evaluation",
                )}
                tone="violet"
              />
            )}
            {stats.draft_courses > 0 && (
              <ActionWidget
                icon={FileEdit}
                count={stats.draft_courses}
                label={t(
                  "teacher_dashboard.actions.draft_courses",
                  "drafts to publish",
                )}
                tone="sky"
              />
            )}
          </div>
        )}

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
          <div className="grid gap-5 mt-4 sm:grid-cols-2 xl:grid-cols-3">
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
          <div className="grid gap-5 mt-4 sm:grid-cols-2 xl:grid-cols-3">
            {courses.slice(0, 6).map((course, i) => (
              <TeacherCourseCard key={course.id} course={course} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A "needs attention" widget for the teacher dashboard. Shows a count + label
 * with a tone-coded icon. When `to` is provided the whole widget is a link
 * (drafts → courses list); otherwise it's an informational tile (grading
 * queues have no cross-course page yet).
 */
function ActionWidget({
  icon: Icon,
  count,
  label,
  tone,
}: {
  icon: LucideIcon;
  count: number;
  label: string;
  tone: "amber" | "violet" | "sky";
}) {
  const toneClasses: Record<typeof tone, string> = {
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
    sky: "bg-sky-50 text-sky-700",
  };
  return (
    <div className="flex items-center gap-3 rounded-xl bg-card ghost-border shadow-editorial p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-headline font-bold text-m3-on-surface leading-none tabular-nums">
          {count}
        </p>
        <p className="text-xs text-m3-on-surface-variant mt-1 leading-snug">
          {label}
        </p>
      </div>
    </div>
  );
}
