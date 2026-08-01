import { ClipboardList } from "lucide-react";

import { QuizAttemptsTable } from "@/routes/teacher/_components/assessment-tables";

import type { CourseStudentDetailController } from "./use-course-student-detail-controller";

/**
 * "Quiz Attempts" section — the shared QuizAttemptsTable with the student
 * column hidden, drilling into the quiz-manage page. Extracted verbatim from
 * the former 659-line course-student-detail.tsx.
 */
export function StudentQuizAttemptsSection({
  controller,
}: {
  controller: CourseStudentDetailController;
}) {
  const { quizAttempts, quizAttemptsLoading, navigate, courseId } = controller;
  return (
    <section className="bg-m3-surface-container-lowest rounded-xl p-6 ghost-border shadow-editorial space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-m3-secondary" />
        <h2 className="font-headline font-bold text-lg text-m3-on-surface">
          Quiz Attempts
        </h2>
      </div>
      <QuizAttemptsTable
        attempts={quizAttempts ?? []}
        loading={quizAttemptsLoading}
        showStudentColumn={false}
        onRowClick={(a) =>
          void navigate({
            to: "/teacher/courses/$courseId/quizzes/$quizId",
            params: { courseId, quizId: a.quiz_id },
          })
        }
      />
    </section>
  );
}
