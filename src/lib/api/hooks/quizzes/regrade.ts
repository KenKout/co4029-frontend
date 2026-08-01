import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "../../client";
import { queryKeys } from "../../query-keys";

// ---------------------------------------------------------------------------
// Moodle-parity phase hooks (backend migrations 0044-0057).
// Endpoints post-date the committed OpenAPI snapshot, so request/response
// types are declared locally following this file's convention.
// ---------------------------------------------------------------------------

// --- Phase 1: regrade -------------------------------------------------------
export interface RegradeScopeIn {
  attempt_ids?: string[] | null;
  question_ids?: string[] | null;
}
export interface RegradeItemRead {
  attempt_id: string;
  question_id: string;
  old_points: number;
  new_points: number;
  old_is_correct: boolean;
  new_is_correct: boolean;
}
export interface RegradeRunRead {
  id: string;
  quiz_id: string;
  status: string;
  answers_scanned: number;
  answers_changed: number;
  attempts_affected: number;
  created_at: string;
  committed_at: string | null;
  items: RegradeItemRead[];
}

/** Phase 1: dry-run a regrade (no writes) — preview changed answers. */
export function useRegradeDryRun(quizId: string | null | undefined) {
  return useMutation({
    mutationFn: (scope: RegradeScopeIn) =>
      apiPost<RegradeRunRead>(
        `/teacher/quizzes/${quizId}/regrade/dry-run`,
        scope,
      ),
  });
}

/** Phase 1: commit a regrade — recomputes scores + gradebook. */
export function useRegradeCommit(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scope: RegradeScopeIn) =>
      apiPost<RegradeRunRead>(
        `/teacher/quizzes/${quizId}/regrade/commit`,
        scope,
      ),
    onSuccess: () => {
      if (quizId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.results(quizId),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.gradebook(quizId),
        });
      }
    },
  });
}
