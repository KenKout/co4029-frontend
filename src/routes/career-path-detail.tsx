import { useMemo } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import {
  useCareerPath,
  useCareerPathProgress,
  useMyCareerEnrollments,
} from "@/lib/api/hooks/career-paths";
import type {
  CareerPathCoursePublic,
  CourseProgressSummary,
} from "@/lib/api/types";

function CourseRow({
  course,
  index,
  progress,
}: {
  course: CareerPathCoursePublic;
  index: number;
  progress?: CourseProgressSummary;
}) {
  const { t } = useTranslation();
  const completion = progress?.completion_percent ?? 0;
  const completed = completion >= 100;

  return (
    <Link
      to="/courses/$slug"
      params={{ slug: course.slug }}
      className="block group"
    >
      <div className="flex items-start gap-4 p-4 rounded-xl bg-card ghost-border hover:shadow-editorial transition-all duration-200 cursor-pointer">
        <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-m3-primary-fixed text-m3-primary shrink-0 font-headline font-bold text-sm">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="font-headline font-semibold text-sm text-m3-on-surface line-clamp-1 leading-snug flex-1">
              {course.title}
            </h3>
            {completed && (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-m3-on-surface-variant">
            <span className="font-mono">{course.slug}</span>
            <span
              className={
                course.is_required
                  ? "text-m3-primary font-semibold"
                  : "text-m3-on-surface-variant"
              }
            >
              {course.is_required
                ? t("career_path_detail.course_required")
                : t("career_path_detail.course_optional")}
            </span>
          </div>
          {progress && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-m3-on-surface-variant font-bold">
                  {t("career_path_detail.course_progress_label")}
                </span>
                <span className="text-[11px] text-m3-on-surface font-semibold">
                  {Math.round(completion)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-m3-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-m3-primary transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, completion))}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
        <ArrowRight className="h-4 w-4 text-m3-on-surface-variant shrink-0 mt-2 opacity-50 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

export default function CareerPathDetailPage() {
  const { t } = useTranslation();
  const { slug } = useParams({ strict: false }) as { slug: string };
  const path = useCareerPath(slug);
  const enrollments = useMyCareerEnrollments();
  const enrolled = useMemo(
    () =>
      (enrollments.data ?? []).some(
        (e) => path.data && e.career_path_id === path.data.id,
      ),
    [enrollments.data, path.data],
  );
  const progress = useCareerPathProgress(
    enrolled && path.data ? path.data.id : undefined,
  );

  if (path.isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-m3-surface-container animate-pulse rounded-lg" />
        <div className="h-32 bg-m3-surface-container animate-pulse rounded-xl" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-m3-surface-container animate-pulse rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  if (path.isError || !path.data) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="rounded-xl bg-m3-error-container border border-m3-error/20 p-6 text-center">
          <p className="text-m3-on-error-container text-sm font-semibold">
            {t("career_path_detail.load_failed")}
          </p>
        </div>
      </div>
    );
  }

  const data = path.data;
  const progressByCourseId = new Map(
    (progress.data?.courses ?? []).map((c) => [c.course_id, c]),
  );
  const firstIncomplete = data.courses.find((c) => {
    const p = progressByCourseId.get(c.course_id);
    return !p || p.completion_percent < 100;
  });

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-8">
      <div>
        <Link to="/career-paths">
          <Button variant="ghost" size="sm" className="gap-2 -ml-3 mb-4">
            <ArrowLeft className="h-4 w-4" />
            {t("career_path_detail.back")}
          </Button>
        </Link>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-m3-primary to-m3-secondary flex items-center justify-center shrink-0">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-headline font-black text-2xl sm:text-3xl text-m3-on-surface tracking-tight">
              {data.name}
            </h1>
            {data.description && (
              <p className="mt-2 text-sm sm:text-base text-m3-on-surface-variant leading-relaxed">
                {data.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-m3-on-surface-variant">
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                <strong>
                  {t("career_path_detail.n_courses", {
                    count: data.courses.length,
                  })}
                </strong>
              </span>
              {enrolled && progress.data && (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("career_path_detail.completed_courses", {
                    completed: progress.data.completed_courses,
                    total: progress.data.course_count,
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {enrolled && progress.data && (
        <div className="rounded-xl bg-card ghost-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-m3-on-surface-variant font-bold">
                {t("career_path_detail.overall_progress")}
              </p>
              <p className="font-headline font-bold text-xl text-m3-on-surface">
                {Math.round(progress.data.overall_percent)}%
              </p>
            </div>
            {firstIncomplete && (
              <Link to="/courses/$slug" params={{ slug: firstIncomplete.slug }}>
                <Button size="sm" className="gap-2">
                  {t("career_path_detail.continue_learning")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
          <div className="h-2 w-full bg-m3-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-m3-primary to-m3-secondary transition-all"
              style={{
                width: `${Math.min(100, Math.max(0, progress.data.overall_percent))}%`,
              }}
            />
          </div>
        </div>
      )}

      {enrolled && progress.data && progress.data.overall_percent >= 100 && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-900">
              {t("career_path_detail.prepared_title")}
            </p>
            <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
              {t("career_path_detail.prepared_body")}
            </p>
          </div>
        </div>
      )}

      {!enrolled && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-5 flex items-start gap-3">
          <Lock className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">
              {t("career_path_detail.managed_enrollment_title")}
            </p>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              {t("career_path_detail.managed_enrollment_body")}
            </p>
          </div>
        </div>
      )}

      <section className="space-y-4">
        <SectionHeader
          title={t("career_path_detail.section_title")}
          subtitle={t("career_path_detail.section_subtitle")}
        />
        {data.courses.length === 0 ? (
          <div className="rounded-xl bg-m3-surface-container-lowest ghost-border p-10 text-center">
            <BookOpen className="h-8 w-8 mx-auto mb-3 text-m3-outline" />
            <p className="text-sm text-m3-on-surface-variant">
              {t("career_path_detail.empty")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.courses.map((c, i) => (
              <CourseRow
                key={c.course_id}
                course={c}
                index={i}
                progress={progressByCourseId.get(c.course_id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
