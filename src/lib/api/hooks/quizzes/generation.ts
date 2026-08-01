import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiPost } from "../../client";
import { queryKeys } from "../../query-keys";
import type { GenerationRunRead } from "../../types";

const TERMINAL_GENERATION_STATUSES = new Set([
  "completed",
  "succeeded",
  "failed",
  "cancelled",
]);

export function useGenerateQuiz(quizId: string | null | undefined) {
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPost<GenerationRunRead>(
        `/teacher/quizzes/${quizId}/generate`,
        payload,
      ),
  });
}

export function useQuizGenerationRun(
  quizId: string | null | undefined,
  runId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.quizzes.generationRun(quizId ?? "", runId ?? ""),
    enabled: !!quizId && !!runId,
    queryFn: async () => {
      const run = await apiFetch<GenerationRunRead>(
        `/teacher/quizzes/${quizId}/generation-runs/${runId}`,
      );
      if (quizId && run.status === "completed") {
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.authoring(quizId),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.questions(quizId),
        });
      }
      return run;
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && TERMINAL_GENERATION_STATUSES.has(data.status)) {
        return false;
      }
      return 3000;
    },
  });
}

/**
 * GET /teacher/quizzes/{quizId}/generation-runs/latest
 *
 * Returns the most recent generation run for ``quizId`` (any status,
 * or ``null`` when the quiz has never been generated). Lets the SPA
 * reattach to an in-flight or recently-failed run on mount without
 * persisting handles in the browser — survives cross-device sessions
 * and tab closes, and lets two teachers viewing the same quiz both
 * see the same run.
 */
export function useLatestQuizGenerationRun(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.latestGenerationRun(quizId ?? ""),
    enabled: !!quizId,
    queryFn: () =>
      apiFetch<GenerationRunRead | null>(
        `/teacher/quizzes/${quizId}/generation-runs/latest`,
      ),
    // Keep the cached value cheap to compute on remount but stale
    // enough that we re-fetch once when the user comes back to the
    // panel — the per-run polling hook takes over from there.
    staleTime: 5_000,
  });
}
