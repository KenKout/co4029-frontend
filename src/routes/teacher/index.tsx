import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle,
  ClipboardCheck,
  Clock,
  FileEdit,
  MessageSquare,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  useTeacherCourses,
  useTeacherDashboardStats,
} from "@/lib/api/hooks/teacher-courses";
import { TeacherCourseCard } from "@/routes/teacher/_components/TeacherCourseCard";
import { ReviewQueueRow } from "@/routes/teacher/_components/ReviewQueueRow";

export default function TeacherDashboard() {
  const { t } = useTranslation();
  const { data: courses = [], isLoading } = useTeacherCourses();
  const { data: stats } = useTeacherDashboardStats();

  const formatCount = (n: number | undefined | null) =>
    n === undefined || n === null ? "—" : String(n);

  // Quiz cards + interview questions are both AI-generated content awaiting a
  // human decision, so the headline tile combines them; the queue below breaks
  // them out.
  const cardsAwaitingReview =
    (stats?.quiz_cards_pending_review ?? 0) +
    (stats?.interview_questions_pending_review ?? 0);

  // Review queue, built as data so zero-count rows can be filtered out rather
  // than rendered as already-done.
  const reviewCandidates: {
    key: string;
    label: string;
    count: number;
    hint?: string;
    icon: typeof ClipboardCheck;
    to: string;
    tone: "amber" | "violet" | "sky";
  }[] = [
    {
      key: "quiz_cards",
      label: t("teacher_dashboard.review.quiz_cards"),
      count: stats?.quiz_cards_pending_review ?? 0,
      hint: t("teacher_dashboard.review.quiz_cards_hint"),
      icon: ClipboardCheck,
      to: "/teacher/courses",
      tone: "amber",
    },
    {
      key: "interview_questions",
      label: t("teacher_dashboard.review.interview_questions"),
      count: stats?.interview_questions_pending_review ?? 0,
      hint: t("teacher_dashboard.review.interview_questions_hint"),
      icon: MessageSquare,
      to: "/teacher/courses",
      tone: "violet",
    },
    {
      key: "missing_texp",
      label: t("teacher_dashboard.review.missing_texp"),
      count: stats?.published_quizzes_missing_texp ?? 0,
      hint: t("teacher_dashboard.review.missing_texp_hint"),
      icon: Clock,
      to: "/teacher/courses",
      tone: "amber",
    },
    {
      key: "materials_ready",
      label: t("teacher_dashboard.review.materials_ready"),
      count: stats?.materials_ready_for_quiz_gen ?? 0,
      hint: t("teacher_dashboard.review.materials_ready_hint"),
      icon: Sparkles,
      to: "/teacher/courses",
      tone: "sky",
    },
    {
      key: "ungraded",
      label: t("teacher_dashboard.review.ungraded_quizzes"),
      count: stats?.ungraded_quizzes ?? 0,
      icon: FileEdit,
      to: "/teacher/courses",
      tone: "amber",
    },
    {
      key: "pending_interviews",
      label: t("teacher_dashboard.review.pending_interviews"),
      count: stats?.pending_interviews ?? 0,
      icon: MessageSquare,
      to: "/teacher/courses",
      tone: "violet",
    },
  ];
  const reviewItems = reviewCandidates.filter((i) => i.count > 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <PageHeader
        title={t("teacher_dashboard.title")}
        subtitle={t("teacher_dashboard.subtitle")}
      />

      {/* Headline signals. Replaces the old Total/Published/Drafts/AI-Enabled
          counts: those were static and answered no question a teacher would act
          on. These four are the ones that change behaviour — what needs review,
          who is falling behind, and how retention is trending. */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label={t("teacher_dashboard.signals.cards_awaiting_review")}
          value={formatCount(cardsAwaitingReview)}
          sublabel={t("teacher_dashboard.signals.cards_awaiting_review_sub")}
          icon={ClipboardCheck}
          variant={cardsAwaitingReview > 0 ? "glow" : "default"}
        />
        <StatCard
          label={t("teacher_dashboard.signals.students_below_ef")}
          value={formatCount(stats?.students_below_ef_threshold)}
          sublabel={t("teacher_dashboard.signals.students_below_ef_sub")}
          icon={TrendingDown}
        />
        <StatCard
          label={t("teacher_dashboard.signals.avg_retention")}
          value={
            stats?.avg_retention_ef ? stats.avg_retention_ef.toFixed(2) : "—"
          }
          sublabel={t("teacher_dashboard.signals.avg_retention_sub")}
          icon={Brain}
        />
        <StatCard
          label={t("teacher_dashboard.signals.cards_overdue")}
          value={formatCount(stats?.cards_overdue)}
          sublabel={t("teacher_dashboard.signals.cards_overdue_sub")}
          icon={Clock}
        />
      </div>

      {/* ---- Needs your review ------------------------------------------- */}
      {/* The Human-in-the-Loop queue: the teacher-facing equivalent of the
          admin's processing queue. Zero-count rows are omitted (same rule as the
          admin needs-attention list) so this never shows resolved work. */}
      <div>
        <SectionHeader
          title={t("teacher_dashboard.review.title")}
          subtitle={t("teacher_dashboard.review.subtitle")}
        />
        {reviewItems.length > 0 ? (
          <div className="mt-4 divide-y divide-m3-outline-variant/20 overflow-hidden rounded-xl bg-card shadow-editorial ghost-border">
            {reviewItems.map((item) => (
              <ReviewQueueRow
                key={item.key}
                label={item.label}
                count={item.count}
                hint={item.hint}
                icon={item.icon}
                to={item.to}
                tone={item.tone}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-card px-5 py-4 shadow-editorial ghost-border">
            <CheckCircle
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-emerald-600"
            />
            <p className="text-sm text-m3-on-surface-variant">
              {t("teacher_dashboard.review.all_clear")}
            </p>
          </div>
        )}
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
          </div>
        ) : (
          <div className="grid gap-5 mt-4 sm:grid-cols-2 xl:grid-cols-3">
            {courses.slice(0, 6).map((course, i) => (
              <TeacherCourseCard
                key={course.id}
                course={course}
                index={i}
                pendingReviewCount={
                  stats?.pending_review_by_course?.[course.id]
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
