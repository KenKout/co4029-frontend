import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronRight,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useQueries } from "@tanstack/react-query";
import {
  type CardStudentResult,
  type DifficultCardWithPrompt,
  useCardStudentResults,
  useCohortKr,
  useDifficultCards,
} from "@/lib/api/hooks/spaced-repetition";
import { useCourse, useCourseModules } from "@/lib/api/hooks/courses";
import { useRelDate } from "@/lib/format/date";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { SectionHeader } from "@/components/ui/section-header";
import { Select } from "@/components/ui/select";
import type { LessonPublic, ModulePublic } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type LessonOption = {
  lesson_id: string;
  lesson_title: string;
  module_title: string;
};

function useAllLessonsForCourse(courseId: string | undefined) {
  const { data: modules, isLoading: modulesLoading } =
    useCourseModules(courseId);

  const sortedModules: ModulePublic[] = (modules ?? [])
    .slice()
    .sort((a, b) => a.position - b.position);

  const lessonQueries = useQueries({
    queries: sortedModules.map((mod) => ({
      queryKey: queryKeys.courses.moduleLessons(mod.id),
      queryFn: () => apiFetch<LessonPublic[]>(`/modules/${mod.id}/lessons`),
    })),
  });

  const lessons: LessonOption[] = [];
  sortedModules.forEach((mod, idx) => {
    const result = lessonQueries[idx];
    if (!result?.data) return;
    for (const l of result.data) {
      lessons.push({
        lesson_id: l.id,
        lesson_title: l.title,
        module_title: mod.title,
      });
    }
  });

  const isLoading = modulesLoading || lessonQueries.some((q) => q.isLoading);

  return { lessons, isLoading };
}

function CohortHistogram({
  data,
}: {
  data: { bucket_lower: number; count: number }[];
}) {
  const { t } = useTranslation();
  const chartData = data.map((b) => ({
    bucket: `${Math.round(b.bucket_lower * 100)}%`,
    count: b.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={chartData}
        margin={{ top: 12, right: 12, bottom: 8, left: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          opacity={0.5}
        />
        <XAxis
          dataKey="bucket"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          stroke="var(--border)"
          label={{
            value: t("teacher_sr_cohort.kr_axis"),
            position: "insideBottom",
            offset: -2,
            fill: "var(--text-muted)",
            fontSize: 11,
          }}
        />
        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          stroke="var(--border)"
          allowDecimals={false}
          label={{
            value: t("teacher_sr_cohort.students_axis"),
            angle: -90,
            position: "insideLeft",
            fill: "var(--text-muted)",
            fontSize: 11,
          }}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-muted)", opacity: 0.4 }}
          contentStyle={{
            backgroundColor: "var(--surface-elev)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--text-strong)",
          }}
          formatter={(value) => [
            String(value),
            t("teacher_sr_cohort.students_axis"),
          ]}
          labelFormatter={(label) =>
            `${t("teacher_sr_cohort.kr_tooltip_label")}: ${String(label ?? "")}`
          }
        />
        <Bar
          dataKey="count"
          fill="var(--primary)"
          radius={[6, 6, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Relative-date formatter reuses the at-risk page's date i18n keys
// (teacher_sr_at_risk.*, the useRelDate defaults) since they already exist in
// both locales.
function efMeta(meanEf: number) {
  if (meanEf < 1.6) {
    return {
      cls: "bg-red-100 text-red-700 border-red-200",
      labelKey: "teacher_sr_cohort.difficulty.hard",
    };
  }
  if (meanEf < 2.0) {
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

/** One difficult-question row; expands to a per-student results panel. */
function DifficultCardRow({
  card,
  courseId,
}: {
  card: DifficultCardWithPrompt;
  courseId: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // Fetch per-student results lazily — only once the row is first expanded.
  const { data: results, isLoading } = useCardStudentResults(
    courseId,
    card.question_id,
    open,
  );
  const meta = efMeta(card.mean_ef);
  const difficultyLabel = t(meta.labelKey);

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        aria-expanded={open}
        className="grid sm:grid-cols-[24px_1fr_150px_110px_140px] gap-4 px-6 py-3 items-center hover:bg-m3-surface-container-low transition-colors cursor-pointer"
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 text-m3-on-surface-variant transition-transform shrink-0",
            open && "rotate-90",
          )}
        />
        <p
          className="text-sm text-m3-on-surface truncate"
          title={card.prompt_text}
        >
          {card.prompt_text || t("teacher_sr_cohort.untitled_question")}
        </p>
        <span
          className={cn(
            "text-xs font-bold px-2.5 py-1 rounded-full border w-fit inline-flex items-center gap-1.5",
            meta.cls,
          )}
          title={t("teacher_sr_cohort.ef_hint")}
        >
          {difficultyLabel}
          <span className="font-mono font-medium opacity-70">
            EF {card.mean_ef.toFixed(2)}
          </span>
        </span>
        <span className="text-sm text-m3-on-surface-variant inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {card.student_count}
        </span>
        <Link
          to="/teacher/courses/$courseId/quizzes/$quizId"
          params={{ courseId, quizId: card.quiz_id }}
          search={{ question: card.question_id }}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-end gap-1.5 text-xs font-semibold text-m3-primary hover:underline cursor-pointer"
        >
          <RefreshCw className="h-3 w-3" />
          {t("teacher_sr_cohort.regenerate_question")}
        </Link>
      </div>

      {open && (
        <div className="px-6 pb-4 pt-1 bg-m3-surface-container-lowest">
          <CardStudentResultsPanel results={results} loading={isLoading} />
        </div>
      )}
    </div>
  );
}

/** Per-student breakdown for one question (weakest first). */
function CardStudentResultsPanel({
  results,
  loading,
}: {
  results: CardStudentResult[] | undefined;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const relDate = useRelDate();

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 justify-center text-sm text-m3-on-surface-variant">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("teacher_sr_cohort.detail.loading")}
      </div>
    );
  }
  if (!results || results.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-m3-on-surface-variant">
        {t("teacher_sr_cohort.detail.empty")}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-m3-outline-variant/20 overflow-hidden">
      <div className="grid grid-cols-[1fr_90px_110px_120px] gap-3 px-4 py-2 bg-m3-surface-container-low">
        <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_sr_cohort.detail.student")}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant text-center">
          {t("teacher_sr_cohort.detail.last_result")}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant text-center">
          {t("teacher_sr_cohort.detail.accuracy")}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant text-right">
          {t("teacher_sr_cohort.detail.last_reviewed")}
        </span>
      </div>
      <div className="divide-y divide-m3-outline-variant/10">
        {results.map((r) => (
          <div
            key={r.student_id}
            className="grid grid-cols-[1fr_90px_110px_120px] gap-3 px-4 py-2.5 items-center"
          >
            <span
              className="text-sm text-m3-on-surface truncate"
              title={r.name}
            >
              {r.name}
            </span>
            <span className="flex justify-center">
              {r.last_correct == null ? (
                <span className="text-xs text-m3-on-surface-variant">—</span>
              ) : r.last_correct ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("teacher_sr_cohort.detail.correct")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                  <XCircle className="h-3.5 w-3.5" />
                  {t("teacher_sr_cohort.detail.incorrect")}
                </span>
              )}
            </span>
            <span className="text-xs text-m3-on-surface-variant text-center tabular-nums">
              {r.review_count > 0
                ? t("teacher_sr_cohort.detail.accuracy_value", {
                    correct: r.correct_count,
                    total: r.review_count,
                  })
                : "—"}
            </span>
            <span className="text-xs text-m3-on-surface-variant text-right">
              {relDate(r.last_reviewed_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TeacherSrCohortPage() {
  const { t } = useTranslation();
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  useCourse(courseId);
  const { lessons, isLoading: lessonsLoading } =
    useAllLessonsForCourse(courseId);

  const [selectedLessonId, setSelectedLessonId] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!selectedLessonId && lessons.length > 0) {
      setSelectedLessonId(lessons[0].lesson_id);
    }
  }, [lessons, selectedLessonId]);

  const { data: cohort, isLoading: cohortLoading } = useCohortKr(
    courseId,
    selectedLessonId,
  );
  const { data: difficult, isLoading: difficultLoading } = useDifficultCards(
    courseId,
    selectedLessonId,
    10,
  );

  const selectedLesson = lessons.find((l) => l.lesson_id === selectedLessonId);
  const histogramTotal =
    cohort?.histogram?.reduce((acc, b) => acc + b.count, 0) ?? 0;

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3 pt-2">
          <SectionHeader
            title={t("teacher_sr_cohort.title")}
            subtitle={t("teacher_sr_cohort.subtitle")}
          />
          <Link
            to="/teacher/courses/$courseId/at-risk"
            params={{ courseId }}
            className="ml-auto shrink-0 inline-flex items-center gap-2 rounded-xl bg-m3-surface-container-low hover:bg-m3-surface-container-high border border-m3-outline-variant/20 px-3 py-2 text-sm font-semibold text-m3-on-surface transition-colors cursor-pointer"
          >
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="hidden sm:inline">
              {t("teacher_sr_cohort.view_at_risk")}
            </span>
          </Link>
        </div>

        <div className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial p-5 space-y-3">
          <label
            htmlFor="lesson-select"
            className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant"
          >
            {t("teacher_sr_cohort.lesson_picker_label")}
          </label>
          <Select
            id="lesson-select"
            value={selectedLessonId ?? ""}
            onValueChange={(next) => setSelectedLessonId(next || undefined)}
            disabled={lessonsLoading || lessons.length === 0}
            placeholder={
              lessonsLoading
                ? t("teacher_sr_cohort.lesson_loading")
                : t("teacher_sr_cohort.lesson_empty")
            }
            options={lessons.map((l) => ({
              value: l.lesson_id,
              label: `${l.module_title} — ${l.lesson_title}`,
            }))}
          />
        </div>

        <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="font-heading font-bold text-lg text-m3-on-surface flex items-center gap-1.5">
                {t("teacher_sr_cohort.histogram_title", {
                  lesson: selectedLesson?.lesson_title ?? "—",
                })}
                <Info
                  className="h-3.5 w-3.5 text-m3-on-surface-variant/60 cursor-help shrink-0"
                  aria-label={t("teacher_sr_cohort.kr_hint")}
                  tabIndex={0}
                >
                  <title>{t("teacher_sr_cohort.kr_hint")}</title>
                </Info>
              </h2>
              <p className="text-xs text-m3-on-surface-variant">
                {t("teacher_sr_cohort.histogram_subtitle")}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-m3-primary bg-m3-primary-fixed px-3 py-1.5 rounded-xl shrink-0">
              <Users className="h-3.5 w-3.5" />
              <span>
                {t("teacher_sr_cohort.student_count", {
                  count: cohort?.student_count ?? 0,
                })}
              </span>
            </div>
          </div>

          {cohortLoading ? (
            <div className="h-[260px] rounded-xl bg-m3-surface-container-low animate-pulse" />
          ) : !cohort || histogramTotal === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-m3-outline-variant flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-m3-primary-fixed flex items-center justify-center">
                <Brain className="h-6 w-6 text-m3-primary" />
              </div>
              <p className="text-sm font-semibold text-m3-on-surface">
                {t("teacher_sr_cohort.no_kr_data_title")}
              </p>
              <p className="text-xs text-m3-on-surface-variant max-w-md">
                {t("teacher_sr_cohort.no_kr_data_body")}
              </p>
            </div>
          ) : (
            <CohortHistogram data={cohort.histogram ?? []} />
          )}

          {cohort && histogramTotal > 0 && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-m3-outline-variant/10">
              <div className="bg-m3-surface-container-low rounded-xl p-4 text-center">
                <p className="text-xs uppercase tracking-widest text-m3-on-surface-variant font-bold">
                  {t("teacher_sr_cohort.stats.mean_kr")}
                </p>
                <p className="text-2xl font-heading font-black text-m3-primary mt-1">
                  {(cohort.mean_kr * 100).toFixed(1)}%
                </p>
              </div>
              <div className="bg-m3-surface-container-low rounded-xl p-4 text-center">
                <p className="text-xs uppercase tracking-widest text-m3-on-surface-variant font-bold">
                  {t("teacher_sr_cohort.stats.median_kr")}
                </p>
                <p className="text-2xl font-heading font-black text-m3-primary mt-1">
                  {(cohort.median_kr * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-m3-outline-variant/20">
            <div className="space-y-0.5">
              <h2 className="font-heading font-bold text-lg text-m3-on-surface flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-m3-secondary" />
                {t("teacher_sr_cohort.difficult_title")}
                <Info
                  className="h-3.5 w-3.5 text-m3-on-surface-variant/60 cursor-help shrink-0"
                  aria-label={t("teacher_sr_cohort.ef_hint")}
                  tabIndex={0}
                >
                  <title>{t("teacher_sr_cohort.ef_hint")}</title>
                </Info>
              </h2>
              <p className="text-xs text-m3-on-surface-variant">
                {t("teacher_sr_cohort.difficult_subtitle")}
              </p>
            </div>
          </div>

          {difficultLoading ? (
            <div className="p-6 space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl bg-m3-surface-container-low animate-pulse"
                />
              ))}
            </div>
          ) : !difficult || difficult.length === 0 ? (
            <div className="px-6 py-12 flex flex-col items-center gap-3 text-center">
              <AlertTriangle className="h-8 w-8 text-m3-on-surface-variant opacity-40" />
              <p className="text-sm font-semibold text-m3-on-surface">
                {t("teacher_sr_cohort.difficult_empty_title")}
              </p>
              <p className="text-xs text-m3-on-surface-variant">
                {t("teacher_sr_cohort.difficult_empty_body")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-m3-outline-variant/10">
              <div className="hidden sm:grid grid-cols-[24px_1fr_150px_110px_140px] gap-4 px-6 py-2.5 bg-m3-surface-container-low">
                <span />
                <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("teacher_sr_cohort.cols.question")}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("teacher_sr_cohort.cols.mean_ef")}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("teacher_sr_cohort.cols.students")}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant text-right">
                  {t("teacher_sr_cohort.cols.actions")}
                </span>
              </div>
              {difficult.map((card) => (
                <DifficultCardRow
                  key={card.question_id}
                  card={card}
                  courseId={courseId}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
