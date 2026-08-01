import { useMutation } from "@tanstack/react-query";
import { apiPost } from "../../client";

/**
 * Quiz integrity (proctoring) event types + reporter hook. The endpoint
 * (`POST /attempts/{id}/integrity-events`) post-dates the committed OpenAPI
 * snapshot, so types are declared locally following this file's convention.
 */
export type QuizIntegrityEventType =
  | "focus_lost"
  | "tab_switch"
  | "fullscreen_exit"
  | "warning_issued"
  | "reconnect"
  | "disconnect";

export type QuizIntegritySeverity = "info" | "warning" | "critical";

export interface QuizIntegrityEvent {
  event_type: QuizIntegrityEventType;
  severity?: QuizIntegritySeverity;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Fire-and-forget batch POST of quiz integrity signals for a live attempt.
 * Mirrors `useReportIntegrityEvents` (interviews). Errors must never break
 * the take, so callers swallow rejections.
 */
export function useReportQuizIntegrityEvents(
  attemptId: string | null | undefined,
) {
  return useMutation({
    mutationFn: ({ events }: { events: QuizIntegrityEvent[] }) =>
      apiPost<{ accepted: number }>(`/attempts/${attemptId}/integrity-events`, {
        events,
      }),
  });
}
