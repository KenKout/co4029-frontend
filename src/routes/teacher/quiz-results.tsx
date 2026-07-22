import { useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BarChart3, HelpCircle, Loader2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { cn } from "@/lib/utils";
import { useQuizAuthoring, useQuizResults } from "@/lib/api/hooks/quizzes";
import {
  useTeacherCourseById,
  useTeacherCourseContent,
} from "@/lib/api/hooks/teacher-courses";
import { ResultsSummaryCards } from "./_components/quiz-results/ResultsSummaryCards";
import { ScoreHistogram } from "./_components/quiz-results/ScoreHistogram";
import { PerStudentTable } from "./_components/quiz-results/PerStudentTable";
import { PerQuestionTable } from "./_components/quiz-results/PerQuestionTable";

type ResultsTab = "students" | "questions";
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
          { label: t("teacher_common.breadcrumb_teaching"), to: "/teacher/courses" },
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
      </div>

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
            </div>

            {tab === "students" ? (
              <PerStudentTable
                rows={results.per_student}
                passingScorePercent={passingScorePercent}
                headlineMetric={headlineMetric}
                onHeadlineMetricChange={setHeadlineMetric}
                onStudentClick={goToStudentDetail}
              />
            ) : (
              <PerQuestionTable questions={results.per_question} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
