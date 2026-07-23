import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Clock,
  Info,
  Lock,
  XCircle,
} from "lucide-react";
import { useStudentSrDetail } from "@/lib/api/hooks/spaced-repetition";
import { useCourse } from "@/lib/api/hooks/courses";
import { SectionHeader } from "@/components/ui/section-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import type { StudentSrDetailLesson } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const STATUS_KEY: Record<StudentSrDetailLesson["status"], string> = {
  mature: "sr_dashboard.status.mature",
  learning: "sr_dashboard.status.learning",
  locked: "sr_dashboard.status.locked",
};

const STATUS_BADGE: Record<StudentSrDetailLesson["status"], string> = {
  mature: "bg-emerald-50 text-emerald-700 border-emerald-200",
  learning: "bg-amber-50 text-amber-700 border-amber-200",
  locked: "bg-slate-100 text-slate-600 border-slate-200",
};

function useFormatRelative() {
  const { t, i18n } = useTranslation();
  const locale =
    (i18n.resolvedLanguage ?? i18n.language ?? "en") === "vi"
      ? "vi-VN"
      : "en-US";
  return (iso: string): string => {
    const now = Date.now();
    const ts = new Date(iso).getTime();
    const diff = now - ts;
    if (diff < 60_000) return t("teacher_sr_student_detail.just_now");
    const minutes = Math.round(diff / 60_000);
    if (minutes < 60)
      return t("teacher_sr_student_detail.minutes_ago", { count: minutes });
    const hours = Math.round(minutes / 60);
    if (hours < 24)
      return t("teacher_sr_student_detail.hours_ago", { count: hours });
    const days = Math.round(hours / 24);
    if (days < 30)
      return t("teacher_sr_student_detail.days_ago", { count: days });
    return new Date(iso).toLocaleDateString(locale);
  };
}

// Maps a spaced-repetition easiness factor (EF) to a human difficulty
// bucket + colour, identical to the cohort page's efMeta so teachers see
// the same "Hard / Medium / Easier" language everywhere instead of a raw
// EF number. Lower EF = the student gets it wrong more often.
function efMeta(ef: number) {
  if (ef < 1.6) {
    return {
      cls: "bg-red-100 text-red-700 border-red-200",
      labelKey: "teacher_sr_cohort.difficulty.hard",
    };
  }
  if (ef < 2.0) {
    return {
      cls: "bg-amber-100 text-amber-700 border-amber-200",
      labelKey: "teacher_sr_cohort.difficulty.medium",
    };
  }
  return {
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    labelKey: "teacher_sr_cohort.difficulty.easier",
  };
}

export default function TeacherSrStudentDetailPage() {
  const { t } = useTranslation();
  const formatRelative = useFormatRelative();
  const { courseId, studentId } = useParams({ strict: false }) as {
    courseId: string;
    studentId: string;
  };
  const { data: course } = useCourse(courseId);
  const { data, isLoading } = useStudentSrDetail(courseId, studentId, {
    recentReviewsLimit: 20,
  });

  const lessons = data?.lessons ?? [];
  const reviews = data?.recent_reviews ?? [];

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-5xl mx-auto pb-6 space-y-6">
        <Breadcrumbs
          items={[
            {
              label: t("teacher_sr_cohort.breadcrumb_teaching"),
              to: "/teacher/courses",
            },
            {
              label: course?.title ?? t("teacher_sr_cohort.breadcrumb_course"),
              to: "/teacher/courses/$courseId",
              params: { courseId },
            },
            {
              label: t("teacher_sr_at_risk.breadcrumb_at_risk"),
              to: "/teacher/courses/$courseId/at-risk",
              params: { courseId },
            },
            {
              label:
                data?.name ?? t("teacher_sr_student_detail.breadcrumb_detail"),
            },
          ]}
        />

        <div className="flex items-center gap-3">
          <Link
            to="/teacher/courses/$courseId/at-risk"
            params={{ courseId }}
            className="p-2 rounded-xl hover:bg-m3-surface-container-high text-m3-on-surface-variant transition-colors cursor-pointer"
            aria-label={t("teacher_sr_cohort.back")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <SectionHeader
            title={data?.name ?? t("common.loading")}
            subtitle={t("teacher_sr_student_detail.subtitle")}
          />
        </div>

        <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial overflow-hidden">
          <div className="px-6 py-4 border-b border-m3-outline-variant/20">
            <h2 className="font-heading font-bold text-base text-m3-on-surface flex items-center gap-2">
              <Brain className="h-4 w-4 text-m3-secondary" />
              {t("teacher_sr_student_detail.lessons_title")}
            </h2>
            <p className="text-xs text-m3-on-surface-variant mt-0.5">
              {t("teacher_sr_student_detail.lessons_subtitle")}
            </p>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl bg-m3-surface-container-low animate-pulse"
                />
              ))}
            </div>
          ) : lessons.length === 0 ? (
            <div className="px-6 py-12 flex flex-col items-center gap-3 text-center">
              <Lock className="h-8 w-8 text-m3-on-surface-variant opacity-40" />
              <p className="text-sm font-semibold text-m3-on-surface">
                {t("teacher_sr_student_detail.empty_lessons")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-m3-outline-variant/10">
              <div className="hidden sm:grid grid-cols-[1fr_160px_120px_120px_120px] gap-3 px-6 py-2.5 bg-m3-surface-container-low">
                <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("teacher_sr_student_detail.cols.lesson")}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant inline-flex items-center gap-1">
                  {t("teacher_sr_cohort.kr_axis")}
                  <Info
                    className="h-3 w-3 text-m3-on-surface-variant/60 cursor-help shrink-0"
                    aria-label={t("teacher_sr_cohort.kr_hint")}
                    tabIndex={0}
                  >
                    <title>{t("teacher_sr_cohort.kr_hint")}</title>
                  </Info>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("teacher_sr_student_detail.cols.cards_total")}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("teacher_sr_student_detail.cols.cards_due")}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("teacher_sr_student_detail.cols.status")}
                </span>
              </div>
              {lessons.map((lesson) => {
                const badge = STATUS_BADGE[lesson.status];
                return (
                  <div
                    key={lesson.lesson_id}
                    className="grid sm:grid-cols-[1fr_160px_120px_120px_120px] gap-3 px-6 py-3 items-center hover:bg-m3-surface-container-low transition-colors"
                  >
                    <p className="text-sm font-medium text-m3-on-surface truncate">
                      {lesson.lesson_title}
                    </p>
                    <p className="text-sm font-bold text-m3-primary">
                      {(lesson.kr_estimate * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-m3-on-surface-variant">
                      {lesson.cards_total}
                    </p>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        lesson.cards_due_now > 0
                          ? "text-amber-600"
                          : "text-m3-on-surface-variant",
                      )}
                    >
                      {lesson.cards_due_now}
                    </p>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2.5 py-1 rounded-full border w-fit",
                        badge,
                      )}
                    >
                      {t(STATUS_KEY[lesson.status])}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial overflow-hidden">
          <div className="px-6 py-4 border-b border-m3-outline-variant/20">
            <h2 className="font-heading font-bold text-base text-m3-on-surface flex items-center gap-2">
              <Clock className="h-4 w-4 text-m3-secondary" />
              {t("teacher_sr_student_detail.recent_title")}
            </h2>
            <p className="text-xs text-m3-on-surface-variant mt-0.5">
              {reviews.length > 0
                ? t("teacher_sr_student_detail.recent_count", {
                    count: reviews.length,
                  })
                : t("teacher_sr_student_detail.no_history")}
            </p>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-12 rounded-xl bg-m3-surface-container-low animate-pulse"
                />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="px-6 py-10 flex flex-col items-center gap-2 text-center">
              <Clock className="h-7 w-7 text-m3-on-surface-variant opacity-40" />
              <p className="text-sm text-m3-on-surface-variant">
                {t("teacher_sr_student_detail.empty_reviews")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-m3-outline-variant/10">
              {reviews.map((review, idx) => (
                <div
                  key={`${review.question_id}-${review.created_at}-${idx}`}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-m3-surface-container-low transition-colors"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      review.correct ? "bg-emerald-100" : "bg-red-100",
                    )}
                  >
                    {review.correct ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium text-m3-on-surface truncate"
                      title={review.prompt_text || undefined}
                    >
                      {review.prompt_text?.trim()
                        ? review.prompt_text
                        : review.correct
                          ? t(
                              "teacher_sr_student_detail.review.answered_correct",
                            )
                          : t(
                              "teacher_sr_student_detail.review.answered_incorrect",
                            )}
                    </p>
                    <p className="text-xs text-m3-on-surface-variant mt-0.5">
                      {formatRelative(review.created_at)}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {(() => {
                      const meta = efMeta(review.ef_after);
                      return (
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2.5 py-1 rounded-full border w-fit inline-flex items-center gap-1.5",
                            meta.cls,
                          )}
                          title={t("teacher_sr_cohort.ef_hint")}
                        >
                          {t(meta.labelKey)}
                          <span className="font-mono font-medium opacity-70">
                            EF {review.ef_after.toFixed(2)}
                          </span>
                        </span>
                      );
                    })()}
                    <Info
                      className="h-3 w-3 text-m3-on-surface-variant/60 cursor-help shrink-0 hidden sm:block"
                      aria-label={t("teacher_sr_cohort.ef_hint")}
                      tabIndex={0}
                    >
                      <title>{t("teacher_sr_cohort.ef_hint")}</title>
                    </Info>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
