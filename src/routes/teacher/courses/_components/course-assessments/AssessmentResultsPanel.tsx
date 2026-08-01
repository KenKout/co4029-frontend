import {
  InterviewSessionsTable,
  QuizAttemptsTable,
} from "@/routes/teacher/_components/assessment-tables";

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
  const {
    tab,
    navigate,
    courseId,
    quizAttempts,
    quizzesLoading,
    filteredQuizAttempts,
    interviewSessions,
    interviewsLoading,
    filteredInterviewSessions,
  } = controller;
  return (
    <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial p-4">
      {tab === "quizzes" ? (
        <QuizAttemptsTable
          attempts={filteredQuizAttempts}
          loading={quizzesLoading}
          showStudentColumn
          emptyState={
            (quizAttempts?.length ?? 0) === 0
              ? "No quiz attempts yet."
              : "No attempts match your filters."
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
            (interviewSessions?.length ?? 0) === 0
              ? "No interview attempts yet."
              : "No attempts match your filters."
          }
          onRowClick={(s) =>
            void navigate({
              to: "/teacher/interview-sessions/$sessionId/gap-report",
              params: { sessionId: s.session_id },
            })
          }
        />
      )}
    </section>
  );
}
