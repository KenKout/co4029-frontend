import { useMemo } from "react";

import {
  useAddQuizQuestion,
  useDeleteQuiz,
  usePatchQuiz,
  usePendingQuestionDeletes,
  usePublishQuiz,
  useQuizAuthoring,
} from "@/lib/api/hooks/quizzes";
import { useTeacherCourseOutcomes } from "@/lib/api/hooks/courses";
import {
  useTeacherCourseById,
  useTeacherCourseContent,
} from "@/lib/api/hooks/teacher-courses";

/**
 * Every server read and write the quiz-manage page needs, plus the derived
 * collections built on top of them. Extracted from quiz-manage.tsx verbatim:
 * the hook call order here is exactly the order the page used to call them in,
 * so React's hook sequence is unchanged.
 */
export function useQuizManageData(courseId: string, quizId: string) {
  const { data: course } = useTeacherCourseById(courseId);
  const { data: authoring, isLoading: authoringLoading } =
    useQuizAuthoring(quizId);
  const { data: content, isLoading: contentLoading } =
    useTeacherCourseContent(courseId);
  const { data: outcomes } = useTeacherCourseOutcomes(courseId);

  const quiz = authoring?.quiz;
  const allQuestions = useMemo(() => authoring?.questions ?? [], [authoring]);

  // Combo-undo: deletes are deferred 5s so rapid deletes stack into one
  // batch that a single Undo can revert. Staged questions are hidden from
  // the list immediately but only sent to the server when the timer expires.
  const pendingDeletes = usePendingQuestionDeletes(quizId);
  const questions = useMemo(
    () => allQuestions.filter((q) => !pendingDeletes.pendingIds.has(q.id)),
    [allQuestions, pendingDeletes.pendingIds],
  );

  const courseModule = useMemo(
    () => content?.modules.find((entry) => entry.id === quiz?.module_id),
    [content, quiz?.module_id],
  );

  const deleteQuiz = useDeleteQuiz(quizId);
  const publishQuiz = usePublishQuiz(quizId);
  const patchQuiz = usePatchQuiz(quizId);
  const addQuestion = useAddQuizQuestion(quizId);

  return {
    course,
    authoringLoading,
    contentLoading,
    outcomes,
    quiz,
    questions,
    courseModule,
    pendingDeletes,
    deleteQuiz,
    publishQuiz,
    patchQuiz,
    addQuestion,
  };
}

export type QuizManageDataController = ReturnType<typeof useQuizManageData>;

/** The quiz once the page's not-found guard has proven it loaded. */
export type LoadedQuiz = NonNullable<QuizManageDataController["quiz"]>;

/** The owning module once the page's not-found guard has proven it loaded. */
export type LoadedModule = NonNullable<
  QuizManageDataController["courseModule"]
>;
