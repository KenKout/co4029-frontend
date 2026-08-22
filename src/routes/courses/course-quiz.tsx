import { useEffect, useRef } from "react";
import { useParams } from "@tanstack/react-router";
import { useSearch } from "@tanstack/react-router";
import { useCourseBySlug } from "@/lib/api/hooks/courses";
import { QuizResultScreen } from "@/routes/courses/_components/QuizResultScreen";
import { QuizIntroStage } from "@/routes/courses/_components/course-quiz/QuizIntroStage";
import {
  QuizLoadingSkeleton,
  QuizNoQuestionsPanel,
  QuizNotFoundPanel,
} from "@/routes/courses/_components/course-quiz/QuizStatusScreens";
import { QuizTakingStage } from "@/routes/courses/_components/course-quiz/QuizTakingStage";
import { useQuizAttemptSession } from "@/lib/quiz/use-quiz-attempt-session";

/**
 * Student quiz-taking route. All attempt state + lifecycle lives in
 * {@link useQuizAttemptSession}; the sub-views (intro, results, hint dialog,
 * submit controls) live in `_components/Quiz*` and `_components/course-quiz/`
 * (both under `routes/courses/`).
 * This file is the shell that picks the stage for the current session state.
 */
export default function CourseQuizPage() {
  const { slug, quizId } = useParams({ strict: false }) as {
    slug: string;
    quizId: string;
  };
  const search = useSearch({
    from: "/_authenticated/courses/$slug/quiz/$quizId",
  });

  const { data: course, isLoading: courseLoading } = useCourseBySlug(slug);
  const session = useQuizAttemptSession(quizId);
  const { quiz, taking, submittedSummary, displayQuestions } = session;
  const autoStarted = useRef(false);

  // `?start=1` (from the review screen's Retry button) jumps straight into
  // the taking screen: start a fresh attempt as soon as the intro is ready.
  // Guarded so re-renders / StrictMode can't fire a second attempt.
  useEffect(() => {
    if (
      search.start &&
      !taking &&
      !submittedSummary &&
      !autoStarted.current
    ) {
      autoStarted.current = true;
      void session.handleStartAttempt();
    }
  }, [search.start, taking, submittedSummary, session]);

  if (
    courseLoading ||
    session.quizLoading ||
    session.attemptsLoading ||
    session.resuming
  ) {
    return <QuizLoadingSkeleton />;
  }

  if (!course || !quiz) {
    return <QuizNotFoundPanel slug={slug} />;
  }

  if (submittedSummary) {
    return (
      <QuizResultScreen
        quiz={quiz}
        summary={submittedSummary}
        totalQuestionsFallback={displayQuestions.length}
        slug={slug}
      />
    );
  }

  if (!taking) {
    return (
      <QuizIntroStage
        session={session}
        quiz={quiz}
        slug={slug}
        courseTitle={course?.title}
      />
    );
  }

  if (displayQuestions.length === 0) {
    return <QuizNoQuestionsPanel slug={slug} />;
  }

  return (
    <QuizTakingStage
      session={session}
      quiz={quiz}
      slug={slug}
      courseTitle={course.title}
    />
  );
}
