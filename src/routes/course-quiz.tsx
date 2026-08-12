import { useParams } from "@tanstack/react-router";
import { useCourseBySlug } from "@/lib/api/hooks/courses";
import { QuizResultScreen } from "@/routes/_components/QuizResultScreen";
import { QuizIntroStage } from "@/routes/_components/course-quiz/QuizIntroStage";
import {
  QuizLoadingSkeleton,
  QuizNoQuestionsPanel,
  QuizNotFoundPanel,
} from "@/routes/_components/course-quiz/QuizStatusScreens";
import { QuizTakingStage } from "@/routes/_components/course-quiz/QuizTakingStage";
import { useQuizAttemptSession } from "@/lib/quiz/use-quiz-attempt-session";

/**
 * Student quiz-taking route. All attempt state + lifecycle lives in
 * {@link useQuizAttemptSession}; the sub-views (intro, results, hint dialog,
 * submit controls) live in `_components/Quiz*` and `_components/course-quiz/`.
 * This file is the shell that picks the stage for the current session state.
 */
export default function CourseQuizPage() {
  const { slug, quizId } = useParams({ strict: false }) as {
    slug: string;
    quizId: string;
  };

  const { data: course, isLoading: courseLoading } = useCourseBySlug(slug);
  const session = useQuizAttemptSession(quizId);
  const { quiz, taking, submittedSummary, displayQuestions } = session;

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
    />
  );
}
