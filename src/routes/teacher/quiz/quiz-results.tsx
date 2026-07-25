import { useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  BarChart3,
  ClipboardCheck,
  Download,
  GraduationCap,
  FileText,
  HelpCircle,
  History,
  Loader2,
  RotateCcw,
  Sigma,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { cn } from "@/lib/utils";
import {
  downloadQuizReport,
  useQuizAuthoring,
  useQuizResults,
  useResponsesReport,
  useStatisticsReport,
} from "@/lib/api/hooks/quizzes";
import {
  useTeacherCourseById,
  useTeacherCourseContent,
} from "@/lib/api/hooks/teacher-courses";
import { ResultsSummaryCards } from "../_components/quiz-results/ResultsSummaryCards";
import { ScoreHistogram } from "../_components/quiz-results/ScoreHistogram";
import { PerStudentTable } from "../_components/quiz-results/PerStudentTable";
import { PerQuestionTable } from "../_components/quiz-results/PerQuestionTable";
import { ResponsesReport } from "../_components/quiz-results/ResponsesReport";
import { StatisticsReport } from "../_components/quiz-results/StatisticsReport";
import { RegradePanel } from "../_components/quiz-results/RegradePanel";
import { NeedsGradingTab } from "../_components/quiz-results/NeedsGradingTab";
import { GradebookTab } from "../_components/quiz-results/GradebookTab";
import { AuditEventsTab } from "../_components/quiz-results/AuditEventsTab";

type ResultsTab =
  | "students"
  | "questions"
  | "responses"
  | "statistics"
  | "grading"
  | "gradebook"
  | "audit";
type HeadlineMetric = "best" | "latest";

export default function QuizResultsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId, quizId } = useParams({ strict: false }) as {
    courseId: string;
    quizId: string;
  };

  const { data: course } = useTeacherCourseById(courseId);
  const { data: results, isLoading, isError } = useQuizResults(quizId);
  // Sourced only for the breadcrumb, so its Module → Quiz depth matches the
  // quiz editor's trail (Teaching → Course → Module → Quiz → Results).
  const { data: authoring } = useQuizAuthoring(quizId);
  const { data: content } = useTeacherCourseContent(courseId);
  const courseModule = content?.modules.find(
    (entry) => entry.id === authoring?.quiz?.module_id,
  );

  const [tab, setTab] = useState<ResultsTab>("students");
  const [headlineMetric, setHeadlineMetric] = useState<HeadlineMetric>("best");
  const [downloading, setDownloading] = useState(false);
  const [regradeOpen, setRegradeOpen] = useState(false);

  // Phase 10 report data — only fetched when the matching tab is open.
  const { data: responsesReport } = useResponsesReport(
    tab === "responses" ? quizId : undefined,
  );
  const { data: statisticsReport } = useStatisticsReport(
    tab === "statistics" ? quizId : undefined,
  );

  async function handleDownload(format: "csv" | "xlsx") {
    if (tab !== "responses" && tab !== "statistics") return;
    setDownloading(true);
    try {
      await downloadQuizReport(quizId, tab, format);
    } catch {
      toast.error(t("teacher_quiz_results.reports.download_failed"));
    } finally {
      setDownloading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-m3-secondary" />
      </div>
    );
  }

  if (isError || !results) {
    return (
      <div className="text-center py-24 text-m3-on-surface-variant space-y-4">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
            <HelpCircle className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="font-headline font-bold text-m3-on-surface">
            {t("teacher_quiz_results.errors.not_found_title")}
          </p>
          <p className="text-sm mt-1">
            {t("teacher_quiz_results.errors.not_found_description")}
          </p>
        </div>
        <Link
          to="/teacher/courses/$courseId/quizzes/$quizId"
          params={{ courseId, quizId }}
          className="inline-flex"
        >
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("teacher_quiz_results.actions.back_to_editor")}
          </Button>
        </Link>
      </div>
    );
  }

  const passingScorePercent = Number(results.passing_score_percent);
  const hasAttempts = results.summary.total_attempts > 0;

  function goToStudentDetail(studentId: string) {
    void navigate({
      to: "/teacher/courses/$courseId/students/$studentId",
      params: { courseId, studentId },
    });
  }

  return (
    <div className="space-y-6 pb-12 max-w-[1500px] mx-auto">
      <Breadcrumbs
        items={[
          {
            label: t("teacher_common.breadcrumb_teaching"),
            to: "/teacher/courses",
          },
          {
            label: course?.title ?? t("teacher_common.breadcrumb_course"),
            to: "/teacher/courses/$courseId",
            params: { courseId },
          },
          ...(courseModule
            ? [
                {
                  label: courseModule.title,
                  to: "/teacher/courses/$courseId/modules/$moduleId" as const,
                  params: { courseId, moduleId: courseModule.id },
                },
              ]
            : []),
          {
            label: results.quiz_title,
            to: "/teacher/courses/$courseId/quizzes/$quizId",
            params: { courseId, quizId },
          },
          { label: t("teacher_quiz_results.breadcrumb") },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Link
            to="/teacher/courses/$courseId/quizzes/$quizId"
            params={{ courseId, quizId }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 mt-1 shrink-0"
              title={t("teacher_quiz_results.actions.back_to_editor")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-3xl lg:text-4xl font-extrabold font-headline tracking-tight text-gradient-primary leading-tight">
              {t("teacher_quiz_results.title")}
            </h1>
            <p className="text-sm text-m3-on-surface-variant">
              {results.quiz_title}
            </p>
          </div>
        </div>
        {hasAttempts && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => setRegradeOpen(true)}
          >
            <RotateCcw className="h-4 w-4" />
            {t("teacher_quiz_results.regrade.action")}
          </Button>
        )}
      </div>

      {regradeOpen && (
        <RegradePanel quizId={quizId} onClose={() => setRegradeOpen(false)} />
      )}

      {!hasAttempts ? (
        <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-6 py-16 text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-xl bg-m3-primary-fixed text-m3-primary flex items-center justify-center">
              <BarChart3 className="h-6 w-6" />
            </div>
          </div>
          <p className="font-headline font-bold text-m3-on-surface">
            {t("teacher_quiz_results.empty.title")}
          </p>
          <p className="text-sm text-m3-on-surface-variant max-w-md mx-auto">
            {t("teacher_quiz_results.empty.description")}
          </p>
        </div>
      ) : (
        <>
          <ResultsSummaryCards
            summary={results.summary}
            passingScorePercent={passingScorePercent}
            gradingMethod={results.grading_method}
          />

          <div className="rounded-xl border border-m3-outline-variant bg-card p-4 shadow-editorial">
            <h2 className="mb-3 text-sm font-semibold text-m3-on-surface">
              {t("teacher_quiz_results.histogram.title")}
            </h2>
            <ScoreHistogram
              histogram={results.summary.histogram}
              passingScorePercent={passingScorePercent}
            />
          </div>

          <div className="space-y-4">
            <div className="bg-m3-surface-container-low rounded-xl p-1 inline-flex gap-1 border border-m3-outline-variant/20">
              <button
                type="button"
                onClick={() => setTab("students")}
                aria-pressed={tab === "students"}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer",
                  tab === "students"
                    ? "bg-surface-elev text-m3-primary shadow-sm"
                    : "text-m3-on-surface-variant hover:text-m3-primary/80",
                )}
              >
                <Users className="h-4 w-4" />
                {t("teacher_quiz_results.tabs.by_student")}
              </button>
              <button
                type="button"
                onClick={() => setTab("questions")}
                aria-pressed={tab === "questions"}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer",
                  tab === "questions"
                    ? "bg-surface-elev text-m3-primary shadow-sm"
                    : "text-m3-on-surface-variant hover:text-m3-primary/80",
                )}
              >
                <HelpCircle className="h-4 w-4" />
                {t("teacher_quiz_results.tabs.by_question")}
              </button>
              <button
                type="button"
                onClick={() => setTab("responses")}
                aria-pressed={tab === "responses"}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer",
                  tab === "responses"
                    ? "bg-surface-elev text-m3-primary shadow-sm"
                    : "text-m3-on-surface-variant hover:text-m3-primary/80",
                )}
              >
                <FileText className="h-4 w-4" />
                {t("teacher_quiz_results.tabs.responses")}
              </button>
              <button
                type="button"
                onClick={() => setTab("statistics")}
                aria-pressed={tab === "statistics"}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer",
                  tab === "statistics"
                    ? "bg-surface-elev text-m3-primary shadow-sm"
                    : "text-m3-on-surface-variant hover:text-m3-primary/80",
                )}
              >
                <Sigma className="h-4 w-4" />
                {t("teacher_quiz_results.tabs.statistics")}
              </button>
              <button
                type="button"
                onClick={() => setTab("grading")}
                aria-pressed={tab === "grading"}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer",
                  tab === "grading"
                    ? "bg-surface-elev text-m3-primary shadow-sm"
                    : "text-m3-on-surface-variant hover:text-m3-primary/80",
                )}
              >
                <ClipboardCheck className="h-4 w-4" />
                {t("teacher_quiz_results.tabs.grading")}
              </button>
              <button
                type="button"
                onClick={() => setTab("gradebook")}
                aria-pressed={tab === "gradebook"}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer",
                  tab === "gradebook"
                    ? "bg-surface-elev text-m3-primary shadow-sm"
                    : "text-m3-on-surface-variant hover:text-m3-primary/80",
                )}
              >
                <GraduationCap className="h-4 w-4" />
                {t("teacher_quiz_results.tabs.gradebook")}
              </button>
              <button
                type="button"
                onClick={() => setTab("audit")}
                aria-pressed={tab === "audit"}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer",
                  tab === "audit"
                    ? "bg-surface-elev text-m3-primary shadow-sm"
                    : "text-m3-on-surface-variant hover:text-m3-primary/80",
                )}
              >
                <History className="h-4 w-4" />
                {t("teacher_quiz_results.tabs.audit")}
              </button>

              {(tab === "responses" || tab === "statistics") && (
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={downloading}
                    onClick={() => void handleDownload("csv")}
                  >
                    <Download className="h-4 w-4" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={downloading}
                    onClick={() => void handleDownload("xlsx")}
                  >
                    <Download className="h-4 w-4" />
                    XLSX
                  </Button>
                </div>
              )}
            </div>

            {tab === "students" && (
              <PerStudentTable
                rows={results.per_student}
                passingScorePercent={passingScorePercent}
                headlineMetric={headlineMetric}
                onHeadlineMetricChange={setHeadlineMetric}
                onStudentClick={goToStudentDetail}
              />
            )}
            {tab === "questions" && (
              <PerQuestionTable questions={results.per_question} />
            )}
            {tab === "responses" &&
              (responsesReport ? (
                <ResponsesReport report={responsesReport} />
              ) : (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-m3-secondary" />
                </div>
              ))}
            {tab === "statistics" &&
              (statisticsReport ? (
                <StatisticsReport report={statisticsReport} />
              ) : (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-m3-secondary" />
                </div>
              ))}
            {tab === "grading" && <NeedsGradingTab quizId={quizId} />}
            {tab === "gradebook" && <GradebookTab quizId={quizId} />}
            {tab === "audit" && <AuditEventsTab quizId={quizId} />}
          </div>
        </>
      )}
    </div>
  );
}
