import { ResultsSummaryCards } from "../../../_components/quiz-results/ResultsSummaryCards";
import { ScoreHistogram } from "../../../_components/quiz-results/ScoreHistogram";
import type { QuizResultsController } from "./use-quiz-results-page";

/** Summary stat cards plus the score-distribution histogram card. */
export function ResultsOverview({
  controller,
  passingScorePercent,
}: {
  controller: QuizResultsController;
  passingScorePercent: number;
}) {
  const { t, results } = controller;
  if (!results) return null;
  return (
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
    </>
  );
}
