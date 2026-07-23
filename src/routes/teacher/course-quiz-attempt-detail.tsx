import { useMemo } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  MinusCircle,
  MonitorX,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { useTeacherCourseById } from "@/lib/api/hooks/teacher-courses";
import {
  useCourseQuizAttemptDetail,
  type QuizAttemptIntegrityEvent,
} from "@/lib/api/hooks/quizzes";
import type { QuizAttemptReviewQuestion } from "@/lib/api/types";
import { cn } from "@/lib/utils";

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/* ── Integrity severity → colour ── */
const SEVERITY_META: Record<string, { badge: string; dot: string }> = {
  critical: { badge: "bg-red-100 text-red-700", dot: "bg-red-500" },
  warning: { badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  info: { badge: "bg-blue-100 text-blue-700", dot: "bg-blue-400" },
};

export default function CourseQuizAttemptDetailPage() {
  const { t } = useTranslation();
  const { courseId, attemptId } = useParams({ strict: false }) as {
    courseId: string;
    attemptId: string;
  };
  const { data: course } = useTeacherCourseById(courseId);
  const { data, isLoading, isError } = useCourseQuizAttemptDetail(
    courseId,
    attemptId,
  );

  const integrityCounts = useMemo(() => {
    const events = data?.integrity_events ?? [];
    const tabSwitch = events.filter((e) => e.event_type === "tab_switch").length;
    const focusLost = events.filter((e) => e.event_type === "focus_lost").length;
    return { total: events.length, tabSwitch, focusLost };
  }, [data]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto pt-6 space-y-4">
        <div className="h-8 w-64 bg-m3-surface-container animate-pulse rounded-lg" />
        <div className="h-32 bg-m3-surface-container animate-pulse rounded-xl" />
        <div className="h-64 bg-m3-surface-container animate-pulse rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-5xl mx-auto pt-10 text-center space-y-3">
        <AlertTriangle className="h-8 w-8 text-m3-on-surface-variant opacity-40 mx-auto" />
        <p className="text-sm text-m3-on-surface-variant">
          {t("teacher_quiz_attempt.load_failed")}
        </p>
        <Link
          to="/teacher/courses/$courseId/assessments"
          params={{ courseId }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-m3-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("teacher_quiz_attempt.back_to_assessments")}
        </Link>
      </div>
    );
  }

  const { attempt, questions, integrity_events } = data;
  const correctCount = questions.filter((q) => q.is_correct).length;

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-5xl mx-auto space-y-6">
        <Breadcrumbs
          items={[
            { label: t("nav.my_courses"), to: "/teacher/courses" },
            {
              label: course?.title ?? "—",
              to: "/teacher/courses/$courseId",
              params: { courseId },
            },
            {
              label: t("teacher_quiz_attempt.breadcrumb_assessments"),
              to: "/teacher/courses/$courseId/assessments",
              params: { courseId },
            },
            { label: t("teacher_quiz_attempt.breadcrumb_attempt") },
          ]}
        />

        <div className="flex items-center gap-3">
          <Link
            to="/teacher/courses/$courseId/assessments"
            params={{ courseId }}
            className="p-2 rounded-xl hover:bg-m3-surface-container-high text-m3-on-surface-variant transition-colors cursor-pointer"
            aria-label={t("teacher_quiz_attempt.back_to_assessments")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <SectionHeader
            title={attempt.quiz_title}
            subtitle={t("teacher_quiz_attempt.subtitle", {
              student: attempt.student_name ?? attempt.student_id,
              number: attempt.attempt_number,
            })}
          />
        </div>

        {/* Summary tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryTile
            label={t("teacher_quiz_attempt.tiles.status")}
            valueNode={<AttemptStatusBadge attempt={attempt} />}
          />
          <SummaryTile
            label={t("teacher_quiz_attempt.tiles.score")}
            value={
              attempt.score_percent != null
                ? `${Number(attempt.score_percent).toFixed(0)}%`
                : "—"
            }
          />
          <SummaryTile
            label={t("teacher_quiz_attempt.tiles.correct")}
            value={`${correctCount}/${questions.length}`}
          />
          <SummaryTile
            label={t("teacher_quiz_attempt.tiles.time_taken")}
            value={fmtDuration(attempt.time_taken_seconds)}
          />
        </div>

        <div className="text-xs text-m3-on-surface-variant flex flex-wrap gap-x-6 gap-y-1">
          <span>
            {t("teacher_quiz_attempt.started")}: {fmtDateTime(attempt.started_at)}
          </span>
          <span>
            {t("teacher_quiz_attempt.submitted")}:{" "}
            {fmtDateTime(attempt.submitted_at)}
          </span>
        </div>

        {/* Integrity / proctoring panel */}
        <IntegrityPanel
          events={integrity_events}
          counts={integrityCounts}
          fmtDateTime={fmtDateTime}
        />

        {/* Per-question breakdown */}
        <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial overflow-hidden">
          <div className="px-5 py-3 border-b border-m3-outline-variant/10">
            <h3 className="font-headline font-bold text-sm text-m3-on-surface">
              {t("teacher_quiz_attempt.questions.title")}
            </h3>
          </div>
          <div className="divide-y divide-m3-outline-variant/10">
            {questions.map((q) => (
              <QuestionRow key={q.question_id} question={q} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  valueNode,
}: {
  label: string;
  value?: string | number;
  valueNode?: React.ReactNode;
}) {
  return (
    <div className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial p-4">
      <div className="text-xl font-headline font-black text-m3-on-surface">
        {valueNode ?? value}
      </div>
      <div className="text-[11px] text-m3-on-surface-variant font-bold uppercase tracking-wide mt-1">
        {label}
      </div>
    </div>
  );
}

function AttemptStatusBadge({
  attempt,
}: {
  attempt: { status?: string; passed?: boolean | null };
}) {
  const { t } = useTranslation();
  if (attempt.passed === true) {
    return (
      <Badge className="text-[11px] border-0 bg-emerald-100 text-emerald-700 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        {t("teacher_quiz_attempt.status.passed")}
      </Badge>
    );
  }
  if (attempt.passed === false) {
    return (
      <Badge className="text-[11px] border-0 bg-red-100 text-red-700 gap-1">
        <XCircle className="h-3 w-3" />
        {t("teacher_quiz_attempt.status.failed")}
      </Badge>
    );
  }
  if (attempt.status === "in_progress") {
    return (
      <Badge className="text-[11px] border-0 bg-slate-100 text-slate-600">
        {t("teacher_quiz_attempt.status.in_progress")}
      </Badge>
    );
  }
  return (
    <Badge className="text-[11px] border-0 bg-amber-50 text-amber-700">
      {t("teacher_quiz_attempt.status.grading")}
    </Badge>
  );
}

function IntegrityPanel({
  events,
  counts,
  fmtDateTime,
}: {
  events: QuizAttemptIntegrityEvent[];
  counts: { total: number; tabSwitch: number; focusLost: number };
  fmtDateTime: (iso: string | null | undefined) => string;
}) {
  const { t } = useTranslation();

  // Clean attempt — reassure the teacher rather than showing an empty box.
  if (counts.total === 0) {
    return (
      <section className="bg-emerald-50/60 rounded-xl border border-emerald-200 p-4 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-headline font-bold text-sm text-emerald-800">
            {t("teacher_quiz_attempt.integrity.clean_title")}
          </h3>
          <p className="text-xs text-emerald-700/80 mt-0.5">
            {t("teacher_quiz_attempt.integrity.clean_body")}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-amber-50/50 rounded-xl border border-amber-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-amber-200/60 flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <h3 className="font-headline font-bold text-sm text-amber-800">
            {t("teacher_quiz_attempt.integrity.flagged_title")}
          </h3>
          <p className="text-xs text-amber-700/80">
            {t("teacher_quiz_attempt.integrity.summary", {
              tab: counts.tabSwitch,
              focus: counts.focusLost,
            })}
          </p>
        </div>
      </div>
      <div className="divide-y divide-amber-200/40 max-h-72 overflow-y-auto">
        {events.map((ev) => {
          const meta = SEVERITY_META[ev.severity] ?? SEVERITY_META.info;
          const Icon =
            ev.event_type === "tab_switch"
              ? MonitorX
              : ev.event_type === "focus_lost"
                ? Eye
                : Clock;
          return (
            <div
              key={ev.id}
              className="flex items-center gap-3 px-5 py-2.5"
            >
              <Icon className="h-4 w-4 text-amber-700 shrink-0" />
              <span className="text-sm text-m3-on-surface flex-1">
                {t(`teacher_quiz_attempt.integrity.event.${ev.event_type}`, {
                  defaultValue: ev.event_type,
                })}
              </span>
              <Badge className={cn("text-[10px] border-0", meta.badge)}>
                {t(`teacher_quiz_attempt.integrity.severity.${ev.severity}`, {
                  defaultValue: ev.severity,
                })}
              </Badge>
              <span className="text-xs text-m3-on-surface-variant whitespace-nowrap tabular-nums">
                {fmtDateTime(ev.created_at)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function QuestionRow({ question }: { question: QuizAttemptReviewQuestion }) {
  const { t } = useTranslation();
  const answered = question.selected_option_id != null || !!question.answer_text;

  return (
    <div className="px-5 py-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
            question.is_correct
              ? "bg-emerald-100 text-emerald-700"
              : answered
                ? "bg-red-100 text-red-700"
                : "bg-slate-100 text-slate-500",
          )}
        >
          {question.is_correct ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : answered ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <MinusCircle className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-m3-on-surface-variant">
              {t("teacher_quiz_attempt.questions.q_label", {
                index: question.position + 1,
              })}
            </span>
            {!answered && (
              <span className="text-[10px] font-semibold text-slate-500">
                {t("teacher_quiz_attempt.questions.skipped")}
              </span>
            )}
          </div>
          <p className="text-sm text-m3-on-surface font-medium">
            {question.prompt_text}
          </p>

          {/* Options with correct / selected markers */}
          {question.options.length > 0 && (
            <div className="mt-2 space-y-1">
              {question.options.map((opt) => {
                const isSelected = opt.id === question.selected_option_id;
                return (
                  <div
                    key={opt.id}
                    className={cn(
                      "flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5",
                      opt.is_correct
                        ? "bg-emerald-50 text-emerald-800"
                        : isSelected
                          ? "bg-red-50 text-red-800"
                          : "text-m3-on-surface-variant",
                    )}
                  >
                    {opt.is_correct ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    ) : isSelected ? (
                      <XCircle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                    ) : (
                      <span className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="flex-1">{opt.option_text}</span>
                    {isSelected && (
                      <span className="text-[10px] font-bold uppercase tracking-wide">
                        {t("teacher_quiz_attempt.questions.their_answer")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Free-text answer (short_answer / fill_blank / code) */}
          {question.answer_text && (
            <div className="mt-2 text-xs">
              <span className="font-semibold text-m3-on-surface-variant">
                {t("teacher_quiz_attempt.questions.their_answer")}:{" "}
              </span>
              <span className="font-mono text-m3-on-surface">
                {question.answer_text}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
