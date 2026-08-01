import { RegradePanel } from "../_components/quiz-results/RegradePanel";
import { ResultsOverview } from "./_components/quiz-results/ResultsOverview";
import {
  ResultsBreadcrumbs,
  ResultsPageHeader,
} from "./_components/quiz-results/ResultsPageHeader";
import {
  ResultsLoading,
  ResultsNoAttempts,
  ResultsNotFound,
} from "./_components/quiz-results/ResultsStates";
import { ResultsTabBar } from "./_components/quiz-results/ResultsTabBar";
import { ResultsTabPanels } from "./_components/quiz-results/ResultsTabPanels";
import { useQuizResultsPage } from "./_components/quiz-results/use-quiz-results-page";

/**
 * Teacher quiz-results workspace: summary, score histogram and seven analysis
 * tabs (students, questions, responses, statistics, grading, gradebook, audit).
 *
 * Queries, tab state and the report downloader live in
 * `./_components/quiz-results/`; this file is the composition shell.
 */
export default function QuizResultsPage() {
  const controller = useQuizResultsPage();
  const {
    t,
    courseId,
    quizId,
    results,
    isLoading,
    isError,
    regradeOpen,
    setRegradeOpen,
  } = controller;

  if (isLoading) {
    return <ResultsLoading />;
  }

  if (isError || !results) {
    return <ResultsNotFound courseId={courseId} quizId={quizId} t={t} />;
  }

  const passingScorePercent = Number(results.passing_score_percent);
  const hasAttempts = results.summary.total_attempts > 0;

  return (
    <div className="space-y-6 pb-12 max-w-[1500px] mx-auto">
      <ResultsBreadcrumbs
        controller={controller}
        quizTitle={results.quiz_title}
      />

      <ResultsPageHeader
        controller={controller}
        quizTitle={results.quiz_title}
        hasAttempts={hasAttempts}
      />

      {regradeOpen && (
        <RegradePanel quizId={quizId} onClose={() => setRegradeOpen(false)} />
      )}

      {!hasAttempts ? (
        <ResultsNoAttempts t={t} />
      ) : (
        <>
          <ResultsOverview
            controller={controller}
            passingScorePercent={passingScorePercent}
          />

          <div className="space-y-4">
            <ResultsTabBar controller={controller} />
            <ResultsTabPanels
              controller={controller}
              passingScorePercent={passingScorePercent}
            />
          </div>
        </>
      )}
    </div>
  );
}
