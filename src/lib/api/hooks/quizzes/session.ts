import { useMutation } from "@tanstack/react-query";
import { apiPost } from "../../client";

/** Ephemeral server ownership calls for a live quiz attempt. */
export function useClaimQuizAttemptSession(attemptId: string | null | undefined) {
  return useMutation({
    mutationFn: () => apiPost<void>(`/attempts/${attemptId}/session/claim`),
  });
}

export function useQuizAttemptHeartbeat(attemptId: string | null | undefined) {
  return useMutation({
    mutationFn: () => apiPost<void>(`/attempts/${attemptId}/session/heartbeat`),
  });
}

export function useTakeoverQuizAttemptSession(
  attemptId: string | null | undefined,
) {
  return useMutation({
    mutationFn: () => apiPost<void>(`/attempts/${attemptId}/session/takeover`),
  });
}

export function useReleaseQuizAttemptSession(
  attemptId: string | null | undefined,
) {
  return useMutation({
    mutationFn: () => apiPost<void>(`/attempts/${attemptId}/session/release`),
  });
}
