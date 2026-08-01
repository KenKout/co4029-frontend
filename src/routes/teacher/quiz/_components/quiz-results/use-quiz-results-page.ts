import { useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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

import type { HeadlineMetric, ResultsTab } from "./types";

/**
 * Controller for the teacher quiz-results page, composed in the exact hook
 * order the pre-split 340-line `QuizResultsPage` body used: route params, the
 * four queries feeding the breadcrumb and summary, local tab / download state,
 * then the two tab-gated report queries.
 */
export function useQuizResultsPage() {
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

  function goToStudentDetail(studentId: string) {
    void navigate({
      to: "/teacher/courses/$courseId/students/$studentId",
      params: { courseId, studentId },
    });
  }

  return {
    t,
    courseId,
    quizId,
    course,
    results,
    isLoading,
    isError,
    courseModule,
    tab,
    setTab,
    headlineMetric,
    setHeadlineMetric,
    downloading,
    regradeOpen,
    setRegradeOpen,
    responsesReport,
    statisticsReport,
    handleDownload,
    goToStudentDetail,
  };
}

export type QuizResultsController = ReturnType<typeof useQuizResultsPage>;
