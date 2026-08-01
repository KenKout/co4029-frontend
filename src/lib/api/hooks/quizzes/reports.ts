import { useQuery } from "@tanstack/react-query";
import { apiFetch, apiGetResponse } from "../../client";
import { queryKeys } from "../../query-keys";
import { filenameFromDisposition } from "./helpers";

// --- Phase 10: reports + export --------------------------------------------
export interface ResponsesReportRow {
  student_id: string;
  attempt_id: string;
  question_id: string;
  prompt_text: string;
  student_answer: string;
  correct_answer: string;
  is_correct: boolean;
  points_awarded: number;
}
export interface ResponsesReportRead {
  quiz_id: string;
  total_attempts: number;
  rows: ResponsesReportRow[];
}
export interface StatisticsReportRow {
  question_id: string;
  prompt_text: string;
  facility_index: number | null;
  discrimination_index: number | null;
  discrimination_note: string | null;
}
export interface StatisticsReportRead {
  quiz_id: string;
  attempts_analyzed: number;
  rows: StatisticsReportRow[];
}

export function useResponsesReport(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.responsesReport(quizId ?? ""),
    queryFn: () =>
      apiFetch<ResponsesReportRead>(
        `/teacher/quizzes/${quizId}/reports/responses`,
      ),
    enabled: !!quizId,
  });
}

export function useStatisticsReport(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.statisticsReport(quizId ?? ""),
    queryFn: () =>
      apiFetch<StatisticsReportRead>(
        `/teacher/quizzes/${quizId}/reports/statistics`,
      ),
    enabled: !!quizId,
  });
}

/**
 * Download a report as CSV or XLSX. Not a query hook — fetches the
 * `?format=` URL, reads the blob, and triggers a browser download.
 */
export async function downloadQuizReport(
  quizId: string,
  report: "responses" | "statistics",
  format: "csv" | "xlsx",
): Promise<void> {
  const res = await apiGetResponse(
    `/teacher/quizzes/${quizId}/reports/${report}?format=${format}`,
  );
  const blob = await res.blob();
  const name = filenameFromDisposition(
    res.headers.get("Content-Disposition"),
    `quiz-${quizId}-${report}.${format}`,
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
