import { AuditEventsTab } from "../../../_components/quiz-results/AuditEventsTab";
import { GradebookTab } from "../../../_components/quiz-results/GradebookTab";
import { NeedsGradingTab } from "../../../_components/quiz-results/NeedsGradingTab";
import { PerQuestionTable } from "../../../_components/quiz-results/PerQuestionTable";
import { PerStudentTable } from "../../../_components/quiz-results/PerStudentTable";
import { ResponsesReport } from "../../../_components/quiz-results/ResponsesReport";
import { StatisticsReport } from "../../../_components/quiz-results/StatisticsReport";
import { ReportDownloadActions } from "../../../_components/quiz-results/ReportDownloadActions";
import type { QuizResultsController } from "./use-quiz-results-page";

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
  } = controller;
  if (!results) return null;
  return (
    <div className="min-h-[24rem]">
      {tab === "students" && (
        <PerStudentTable
          quizId={quizId}
          passingScorePercent={passingScorePercent}
          headlineMetric={headlineMetric}
          onHeadlineMetricChange={setHeadlineMetric}
          onStudentClick={goToStudentDetail}
        />
      )}
      {tab === "questions" && <PerQuestionTable quizId={quizId} />}
      {tab === "responses" && (
        <ResponsesReport
          quizId={quizId}
          trailing={
            <ReportDownloadActions
              downloading={controller.downloading}
              onDownload={(format) => void controller.handleDownload(format)}
            />
          }
        />
      )}
      {tab === "statistics" && (
        <StatisticsReport
          quizId={quizId}
          trailing={
            <ReportDownloadActions
              downloading={controller.downloading}
              onDownload={(format) => void controller.handleDownload(format)}
            />
          }
        />
      )}
      {tab === "grading" && <NeedsGradingTab quizId={quizId} />}
      {tab === "gradebook" && (
        <GradebookTab
          quizId={quizId}
          downloading={controller.downloading}
          onDownload={(format) => void controller.handleDownload(format)}
        />
      )}
      {tab === "audit" && <AuditEventsTab quizId={quizId} />}
    </div>
  );
}
