import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGetResponse, apiPost } from "../../client";
import { queryKeys } from "../../query-keys";
import { filenameFromDisposition } from "./helpers";

/** Download a quiz's questions exported to GIFT (txt) or Moodle XML. */
export async function downloadQuizExport(
  quizId: string,
  format: "gift" | "xml",
): Promise<void> {
  const res = await apiGetResponse(
    `/teacher/quizzes/${quizId}/questions/export?format=${format}`,
  );
  const blob = await res.blob();
  const ext = format === "gift" ? "txt" : "xml";
  const name = filenameFromDisposition(
    res.headers.get("Content-Disposition"),
    `quiz-${quizId}-questions.${ext}`,
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

// --- Phase 11: import ------------------------------------------------------
export interface ImportResult {
  imported: number;
  skipped: number;
  warnings: string[];
}

export function useImportQuestionsFromFile(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      content,
      format,
    }: {
      content: string;
      format: "gift" | "xml";
    }) =>
      apiPost<ImportResult>(
        `/teacher/quizzes/${quizId}/questions/import-file`,
        {
          content,
          format,
        },
      ),
    onSuccess: () => {
      if (quizId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.authoring(quizId),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.questions(quizId),
        });
      }
    },
  });
}
