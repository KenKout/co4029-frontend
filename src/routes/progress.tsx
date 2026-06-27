import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, BarChart3, BookOpen, Brain, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyCourses } from "@/lib/api/hooks/courses";
import { useMyCourseProgress } from "@/lib/api/hooks/progress";
import { useCardsDue } from "@/lib/api/hooks/spaced-repetition";
import type { Course } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** FR-6.1 / FR-4.8 — student progress overview (replaces the old stub). */
export default function ProgressPage() {
  const { t } = useTranslation();
  const courses = useMyCourses(50);
  const cardsDue = useCardsDue({ limit: 50 });

  const dueCount = cardsDue.items?.length ?? 0;
  const dueLabel = cardsDue.hasNextPage ? `${dueCount}+` : String(dueCount);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="font-headline font-bold text-2xl text-m3-on-surface flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-m3-primary" />
          {t("progress_page.title")}
        </h1>
        <p className="text-sm text-m3-on-surface-variant mt-1">{t("progress_page.subtitle")}</p>
      </div>

      <div className="rounded-xl bg-card ghost-border p-5 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-m3-primary-fixed flex items-center justify-center">
            <Brain className="h-5 w-5 text-m3-primary" />
          </div>
          <div>
            <p className="text-2xl font-headline font-bold text-m3-on-surface">{dueLabel}</p>
            <p className="text-xs text-m3-on-surface-variant">
              {t("progress_page.cards_due")}
            </p>
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <Link to="/study/cards-due">
            <Button size="sm" className="gradient-primary text-white border-0 gap-2">
              {t("progress_page.review_now")} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/dashboard/sr">
            <Button size="sm" variant="outline">
              {t("progress_page.sr_dashboard")}
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("progress_page.courses_heading")}
        </h2>
        {courses.isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-m3-surface-container animate-pulse rounded-xl" />
            ))}
          </div>
        ) : courses.isError ? (
          <div className="rounded-xl bg-m3-surface-container-lowest ghost-border p-10 text-center">
            <p className="text-sm text-m3-error">{t("progress_page.load_failed")}</p>
          </div>
        ) : !courses.items?.length ? (
          <div className="rounded-xl bg-m3-surface-container-lowest ghost-border p-10 text-center">
            <BookOpen className="h-8 w-8 mx-auto mb-3 text-m3-outline" />
            <p className="text-sm text-m3-on-surface-variant mb-4">
              {t("progress_page.no_courses")}
            </p>
            <Link to="/courses">
              <Button size="sm" className="gradient-primary text-white border-0 gap-2">
                {t("progress_page.browse_courses")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : (
          courses.items.map((course) => <CourseProgressCard key={course.id} course={course} />)
        )}
      </div>
    </div>
  );
}

function CourseProgressCard({ course }: { course: Course }) {
  const { t } = useTranslation();
  const { data: progress } = useMyCourseProgress(course.id);

  const percent = progress ? Math.min(100, Number(progress.completion_percent) || 0) : null;
  const hours = progress ? progress.total_time_seconds / 3600 : 0;

  return (
    <div className="rounded-xl bg-card ghost-border p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium text-m3-on-surface truncate">{course.title}</p>
          {progress && (
            <p className="text-xs text-m3-on-surface-variant mt-0.5 flex items-center gap-3 flex-wrap">
              <span>
                {t("progress_page.lessons_done", {
                  completed: progress.completed_lessons,
                  total: progress.total_lessons,
                })}
              </span>
              {progress.total_time_seconds > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {t("progress_page.time_spent", { hours: hours.toFixed(1) })}
                </span>
              )}
            </p>
          )}
        </div>
        <Link to="/courses/$slug/learn" params={{ slug: course.slug }}>
          <Button size="sm" variant="outline" className="gap-1 shrink-0">
            {t("progress_page.continue")} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
      {percent !== null && (
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-m3-surface-container overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                percent >= 100 ? "bg-emerald-500" : "gradient-primary",
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-[11px] text-m3-on-surface-variant text-right">
            {percent.toFixed(0)}%
          </p>
        </div>
      )}
    </div>
  );
}
