import {
  InterviewSessionsTable,
  QuizAttemptsTable,
} from "@/routes/teacher/_components/assessment-tables";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

import type { CourseAssessmentsController } from "./use-course-assessments-controller";

/**
 * The results panel — whichever of the two shared tables the active tab calls
 * for, with the same empty-state wording and the same row-click targets as
 * before. Extracted verbatim from the former 458-line course-assessments.tsx.
 */
export function AssessmentResultsPanel({
  controller,
}: {
  controller: CourseAssessmentsController;
}) {
  const { t } = useTranslation();
  const {
    tab,
    navigate,
    courseId,
    quizzesLoading,
    filteredQuizAttempts,
    interviewsLoading,
    filteredInterviewSessions,
    activeChips,
    canGoNext,
    canGoPrev,
    goNextPage,
    goPrevPage,
    pageIndex,
  } = controller;
  const isFiltered = activeChips.length > 0;
  return (
    <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial p-4">
      {tab === "quizzes" ? (
        <QuizAttemptsTable
          attempts={filteredQuizAttempts}
          loading={quizzesLoading}
          showStudentColumn
          emptyState={
            !isFiltered
              ? t("teacher_assessments.empty.quiz")
              : t("teacher_assessments.empty.filtered")
          }
          onRowClick={(a) =>
            void navigate({
              to: "/teacher/courses/$courseId/quiz-attempts/$attemptId",
              params: { courseId, attemptId: a.id },
            })
          }
        />
      ) : (
        <InterviewSessionsTable
          sessions={filteredInterviewSessions}
          loading={interviewsLoading}
          showStudentColumn
          emptyState={
            !isFiltered
              ? t("teacher_assessments.empty.interview")
              : t("teacher_assessments.empty.filtered")
          }
          onRowClick={(s) =>
            void navigate({
              to: "/teacher/interview-sessions/$sessionId/gap-report",
              params: { sessionId: s.session_id },
            })
          }
        />
      )}

      {(canGoPrev || canGoNext) && (
        <nav
          className="flex items-center justify-end gap-2 pt-3"
          aria-label={t("teacher_assessments.pagination.label")}
        >
          <span className="text-xs text-m3-on-surface-variant mr-auto">
            {t("teacher_assessments.pagination.page", { page: pageIndex + 1 })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={goPrevPage}
            disabled={!canGoPrev}
          >
            {t("common.previous")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={goNextPage}
            disabled={!canGoNext}
          >
            {t("teacher_assessments.pagination.next")}
          </Button>
        </nav>
      )}
    </section>
  );
}
