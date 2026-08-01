import { Loader2 } from "lucide-react";

import { AuditEventsTab } from "../../../_components/quiz-results/AuditEventsTab";
import { GradebookTab } from "../../../_components/quiz-results/GradebookTab";
import { NeedsGradingTab } from "../../../_components/quiz-results/NeedsGradingTab";
import { PerQuestionTable } from "../../../_components/quiz-results/PerQuestionTable";
import { PerStudentTable } from "../../../_components/quiz-results/PerStudentTable";
import { ResponsesReport } from "../../../_components/quiz-results/ResponsesReport";
import { StatisticsReport } from "../../../_components/quiz-results/StatisticsReport";
import type { QuizResultsController } from "./use-quiz-results-page";

function ReportSpinner() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-m3-secondary" />
    </div>
  );
}

/**
 * The active tab's body. Each panel stays conditionally mounted exactly as in
 * the pre-split page, so a tab switch remounts rather than hides.
 */
export function ResultsTabPanels({
  controller,
  passingScorePercent,
}: {
  controller: QuizResultsController;
  passingScorePercent: number;
}) {
  const {
    tab,
    quizId,
    results,
    headlineMetric,
    setHeadlineMetric,
    goToStudentDetail,
    responsesReport,
    statisticsReport,
  } = controller;
  if (!results) return null;
  return (
    <>
      {tab === "students" && (
        <PerStudentTable
          rows={results.per_student}
          passingScorePercent={passingScorePercent}
          headlineMetric={headlineMetric}
          onHeadlineMetricChange={setHeadlineMetric}
          onStudentClick={goToStudentDetail}
        />
      )}
      {tab === "questions" && (
        <PerQuestionTable questions={results.per_question} />
      )}
      {tab === "responses" &&
        (responsesReport ? (
          <ResponsesReport report={responsesReport} />
        ) : (
          <ReportSpinner />
        ))}
      {tab === "statistics" &&
        (statisticsReport ? (
          <StatisticsReport report={statisticsReport} />
        ) : (
          <ReportSpinner />
        ))}
      {tab === "grading" && <NeedsGradingTab quizId={quizId} />}
      {tab === "gradebook" && <GradebookTab quizId={quizId} />}
      {tab === "audit" && <AuditEventsTab quizId={quizId} />}
    </>
  );
}
