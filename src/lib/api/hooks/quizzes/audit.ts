import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../client";
import { queryKeys } from "../../query-keys";

// --- Phase 13: audit events ------------------------------------------------
export interface AuditEventRow {
  id: string;
  event_name: string;
  quiz_id: string;
  actor_user_id: string | null;
  subject_attempt_id: string | null;
  subject_question_id: string | null;
  subject_user_id: string | null;
  payload_json: Record<string, unknown>;
  occurred_at: string;
}

export function useQuizAuditEvents(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.auditEvents(quizId ?? ""),
    queryFn: () =>
      apiFetch<AuditEventRow[]>(`/teacher/quizzes/${quizId}/audit-events`),
    enabled: !!quizId,
  });
}
