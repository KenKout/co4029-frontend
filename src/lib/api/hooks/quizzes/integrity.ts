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
 * Server-authoritative ingest result.
 *
 * `warning_issued` is true only on the request whose events first pushed the
 * attempt's weighted score to the quiz's threshold. The flag lives on the
 * attempt row, so a retried crossing batch reports false and the client
 * cannot forge a warning.
 */
export interface QuizIntegrityBatchResult {
  accepted: number;
  integrity_score: number;
  integrity_score_threshold: number;
  warning_issued: boolean;
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
      apiPost<QuizIntegrityBatchResult>(
        `/attempts/${attemptId}/integrity-events`,
        { events },
      ),
  });
}
