import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ApiError, apiDelete, apiFetch, apiPatch, apiPost } from "../client";
import { queryKeys } from "../query-keys";
import type {
  GapReportAuthoringRead,
  GapReportRead,
  IntegrityEventsRequest,
  IntegrityEventsResponse,
  InterviewConfigAuthoring,
  InterviewConfigCreate,
  InterviewConfigUpdate,
  InterviewForAuthoringPublic,
  InterviewForTakingPublic,
  InterviewGenerationRequest,
  InterviewGenerationRunPublic,
  InterviewOnboardingRespondRequest,
  InterviewOnboardingRespondResponse,
  InterviewOutcomeAuthoring,
  InterviewOutcomeCreate,
  InterviewQuestionAuthoring,
  InterviewQuestionBankItemCreate,
  InterviewQuestionBankItemRead,
  InterviewQuestionBankItemUpdate,
  InterviewQuestionCreate,
  InterviewQuestionDuplicateCheck,
  InterviewQuestionDuplicateCheckRequest,
  InterviewSessionFinishResponse,
  InterviewSessionFinishRequest,
  InterviewSessionPublic,
  InterviewSessionStartRequest,
  InterviewSessionStartResponse,
  InterviewSessionSummary,
  InterviewSessionTeacherRead,
  InterviewTranscriptRead,
  RealtimeAgentDispatchResponse,
  RealtimeTokenResponse,
} from "../types";

export function useInterviewForTaking(configId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.interviews.detail(configId ?? ""),
    queryFn: () =>
      apiFetch<InterviewForTakingPublic>(`/interview-configs/${configId}`),
    enabled: !!configId,
  });
}

export function useStartInterviewSession(configId: string | null | undefined) {
  const { i18n } = useTranslation();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InterviewSessionStartRequest) =>
      apiPost<InterviewSessionStartResponse>(
        `/interview-configs/${configId}/sessions`,
        body,
        {
          "Accept-Language": i18n.resolvedLanguage ?? i18n.language ?? "en",
        },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.interviews.mySessionsAnyScope(),
      });
    },
  });
}

export function useInterviewSession(
  sessionId: string | null | undefined,
  options?: { refetchInterval?: number },
) {
  return useQuery({
    queryKey: queryKeys.interviews.session(sessionId ?? ""),
    queryFn: () =>
      apiFetch<InterviewSessionPublic>(`/interview-sessions/${sessionId}`),
    enabled: !!sessionId,
    // Used by the voice-completion flow to poll until the server marks the
    // session terminal (TanStack Query does NOT poll by default).
    refetchInterval: options?.refetchInterval,
  });
}

export function useInterviewOnboarding(sessionId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InterviewOnboardingRespondRequest) =>
      apiPost<InterviewOnboardingRespondResponse>(
        `/interview-sessions/${sessionId}/onboarding/respond`,
        body,
      ),
    onSuccess: () => {
      if (sessionId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.interviews.session(sessionId),
        });
      }
    },
  });
}

export function useFinishInterview(sessionId: string | null | undefined) {
  const { i18n } = useTranslation();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InterviewSessionFinishRequest = { reason: "natural" }) =>
      apiPost<InterviewSessionFinishResponse>(
        `/interview-sessions/${sessionId}/finish`,
        body,
        {
          "Accept-Language": i18n.resolvedLanguage ?? i18n.language ?? "en",
        },
      ),
    onSuccess: () => {
      if (sessionId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.interviews.session(sessionId),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.interviews.gapReport(sessionId),
        });
      }
      void qc.invalidateQueries({
        queryKey: queryKeys.interviews.mySessionsAnyScope(),
      });
    },
  });
}

export function useGapReport(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.interviews.gapReport(sessionId ?? ""),
    queryFn: () =>
      apiFetch<GapReportRead>(`/interview-sessions/${sessionId}/gap-report`),
    enabled: !!sessionId,
    // Post-session evaluation runs async in a worker (~1-2 min). Until it
    // finishes the report 404s — keep polling instead of giving up, and keep
    // retrying the 404 so a transient miss doesn't strand the result screen.
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status === 404 && failureCount < 60,
    retryDelay: 3000,
    refetchInterval: (query) => (query.state.data === undefined ? 3000 : false),
  });
}

export function useMyInterviewSessions(configId?: string) {
  return useQuery({
    queryKey: queryKeys.interviews.mySessions(configId),
    queryFn: () =>
      apiFetch<InterviewSessionPublic[]>(
        `/me/interview-sessions${configId ? `?config_id=${configId}` : ""}`,
      ),
    refetchInterval: (query) =>
      hasPendingInterviewEvaluation(query.state.data) ? 3000 : false,
  });
}

type InterviewEvaluationState = {
  status: string;
  pass_verdict?: boolean | null;
};

function hasPendingInterviewEvaluation(
  sessions: readonly InterviewEvaluationState[] | undefined,
): boolean {
  return Boolean(
    sessions?.some(
      (session) =>
        (session.status === "completed" || session.status === "timed_out") &&
        session.pass_verdict == null,
    ),
  );
}

/* ───────────────── Teacher-side (W5.4) ───────────────── */

export function useInterviewForAuthoring(configId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.interviews.configAuthoring(configId ?? ""),
    queryFn: () =>
      apiFetch<InterviewForAuthoringPublic>(
        `/teacher/interview-configs/${configId}`,
      ),
    enabled: !!configId,
  });
}

/**
 * POST /teacher/courses/{course_id}/interview-configs — create a draft config.
 */
export function useCreateInterviewConfig(courseId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InterviewConfigCreate) =>
      apiPost<InterviewConfigAuthoring>(
        `/teacher/courses/${courseId}/interview-configs`,
        payload,
      ),
    onSuccess: (config) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.interviews.configAuthoring(config.id),
      });
      if (courseId) {
        void qc.invalidateQueries({
          queryKey: ["teacher", "courses", courseId, "content"],
        });
      }
    },
  });
}

/**
 * GET /teacher/interview-configs/{config_id} — authoring projection (full schema,
 * status widened to draft|published|archived).
 * @deprecated Use useInterviewForAuthoring instead for access to questions & outcomes.
 */
export function useInterviewConfig(configId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.interviews.configAuthoring(configId ?? ""),
    queryFn: () =>
      apiFetch<InterviewConfigAuthoring>(
        `/teacher/interview-configs/${configId}`,
      ),
    enabled: !!configId,
  });
}

/**
 * PATCH /teacher/interview-configs/{config_id} — partial update (title, persona,
 */
export function useUpdateInterviewConfig(configId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InterviewConfigUpdate) =>
      apiPatch<InterviewConfigAuthoring>(
        `/teacher/interview-configs/${configId}`,
        payload,
      ),
    onSuccess: (config) => {
      // The authoring page caches a compound response
      // ({ config, questions, outcomes }), while PATCH returns only the updated
      // config. Put that response into the compound cache immediately so the
      // settings draft is compared with the value that was actually persisted.
      // Invalidating alone leaves the old config visible until the background
      // GET finishes (or indefinitely if that refetch fails), so the footer
      // keeps saying "Unsaved changes" after a successful save.
      qc.setQueryData<InterviewForAuthoringPublic | InterviewConfigAuthoring>(
        queryKeys.interviews.configAuthoring(config.id),
        (current) => {
          if (!current) return current;
          if ("config" in current) {
            return { ...current, config };
          }
          // Keep the deprecated bare-config reader coherent too; it currently
          // shares this query key with the compound authoring reader.
          return config;
        },
      );
      void qc.invalidateQueries({
        queryKey: queryKeys.interviews.configAuthoring(config.id),
      });
      void qc.invalidateQueries({
        queryKey: ["teacher", "courses", config.course_id, "content"],
      });
    },
  });
}

/**
 * POST /teacher/interview-configs/{config_id}/publish — flip status to published.
 *
 * Backend rejects publish when there are no approved questions; the route
 * surfaces the Vietnamese microcopy "Tạo câu hỏi trước khi xuất bản" on 4xx.
 */
export function usePublishInterviewConfig(configId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiPost<InterviewConfigAuthoring>(
        `/teacher/interview-configs/${configId}/publish`,
      ),
    onSuccess: (config) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.interviews.configAuthoring(config.id),
      });
      void qc.invalidateQueries({
        queryKey: ["teacher", "courses", config.course_id, "content"],
      });
    },
  });
}

/**
 * POST /teacher/interview-configs/{config_id}/archive — flip status to archived.
 */
export function useArchiveInterviewConfig(configId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiPost<InterviewConfigAuthoring>(
        `/teacher/interview-configs/${configId}/archive`,
      ),
    onSuccess: (config) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.interviews.configAuthoring(config.id),
      });
      void qc.invalidateQueries({
        queryKey: ["teacher", "courses", config.course_id, "content"],
      });
    },
  });
}

/**
 * POST /teacher/interview-configs/{config_id}/unarchive — flip status back to draft.
 */
export function useUnarchiveInterviewConfig(
  configId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiPost<InterviewConfigAuthoring>(
        `/teacher/interview-configs/${configId}/unarchive`,
      ),
    onSuccess: (config) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.interviews.configAuthoring(config.id),
      });
      void qc.invalidateQueries({
        queryKey: ["teacher", "courses", config.course_id, "content"],
      });
    },
  });
}

/**
 * POST /teacher/interview-configs/{config_id}/unpublish — flip a published
 * config back to draft (hides it from students so it can be edited/regenerated).
 */
export function useUnpublishInterviewConfig(
  configId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiPost<InterviewConfigAuthoring>(
        `/teacher/interview-configs/${configId}/unpublish`,
      ),
    onSuccess: (config) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.interviews.configAuthoring(config.id),
      });
      void qc.invalidateQueries({
        queryKey: ["teacher", "courses", config.course_id, "content"],
      });
    },
  });
}

/**
 * DELETE /teacher/interview-configs/{config_id} — soft-delete.
 *
 * Pass `courseId` so the course content lists (both the public and teacher
 * projections) are invalidated on success — otherwise the deleted interview
 * lingers as a stale module item on the course page and clicking it 404s
 * ("Interview set not found").
 */
export function useDeleteInterviewConfig(
  configId: string | null | undefined,
  courseId?: string | null,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiDelete(`/teacher/interview-configs/${configId}`),
    onSuccess: () => {
      if (configId) {
        qc.removeQueries({
          queryKey: queryKeys.interviews.configAuthoring(configId),
        });
      }
      if (courseId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.courses.content(courseId),
        });
        void qc.invalidateQueries({
          queryKey: ["teacher", "courses", courseId, "content"],
        });
      }
    },
  });
}

/**
 * POST /teacher/interview-configs/{config_id}/questions — manual create.
 * New questions are stored with review_status='approved' (the service-layer
 * default for teacher-authored questions).
 */
export function useCreateInterviewQuestion(
  configId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InterviewQuestionCreate) =>
      apiPost<InterviewQuestionAuthoring>(
        `/teacher/interview-configs/${configId}/questions`,
        payload,
      ),
    onSuccess: () => {
      if (configId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.interviews.configAuthoring(configId),
        });
      }
    },
  });
}

/**
 * PATCH /teacher/interview-configs/{config_id}/questions/{question_id} —
 * partial update (used to flip review_status: 'pending' → 'approved' and to
 * edit prompt_text / question_type / difficulty / position).
 */
export function useUpdateInterviewQuestion(
  configId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      questionId,
      patch,
    }: {
      questionId: string;
      patch: Partial<{
        prompt_text: string;
        question_type: InterviewQuestionAuthoring["question_type"];
        difficulty: InterviewQuestionAuthoring["difficulty"];
        review_status: InterviewQuestionAuthoring["review_status"];
        linked_outcome_id: string | null;
        position: number;
        model_answer: string | null;
      }>;
    }) =>
      apiPatch<InterviewQuestionAuthoring>(
        `/teacher/interview-configs/${configId}/questions/${questionId}`,
        patch,
      ),
    onSuccess: () => {
      if (configId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.interviews.configAuthoring(configId),
        });
      }
    },
  });
}

/**
 * POST /teacher/interview-configs/{config_id}/questions/check-duplicate —
 * advisory "is this already in the bank?" check, run just before saving.
 *
 * Deliberately a mutation rather than a query: it is a one-shot POST tied to a
 * save click, not cacheable state, and the caller awaits the verdict inline.
 *
 * Non-blocking by contract — the backend never refuses a save on the strength
 * of this, and neither should callers. A rejected promise (network, 5xx) means
 * the check could not run, which is not evidence of uniqueness; callers should
 * treat that the same as `error` being set and save anyway.
 */
/**
 * Should this verdict actually be shown to the teacher?
 *
 * The response packs three distinct outcomes into one shape, and only one of
 * them is a real duplicate. `enabled: false` (dedup switched off) and a
 * non-empty `error` (check could not run) both come back with
 * `is_duplicate: false` — reading that flag alone would silently turn "we
 * don't know" into "it's unique". Nothing here is blocking either way; a false
 * result just means save without interrupting.
 */
export function isActionableDuplicate(
  verdict: InterviewQuestionDuplicateCheck,
): boolean {
  return verdict.enabled && !verdict.error && verdict.is_duplicate;
}

export function useCheckInterviewQuestionDuplicate(
  configId: string | null | undefined,
) {
  return useMutation({
    mutationFn: (payload: InterviewQuestionDuplicateCheckRequest) =>
      apiPost<InterviewQuestionDuplicateCheck>(
        `/teacher/interview-configs/${configId}/questions/check-duplicate`,
        payload,
      ),
  });
}

/**
 * DELETE /teacher/interview-configs/{config_id}/questions/{question_id} —
 * soft-delete a single question.
 */
export function useDeleteInterviewQuestion(
  configId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) =>
      apiDelete(
        `/teacher/interview-configs/${configId}/questions/${questionId}`,
      ),
    onSuccess: () => {
      if (configId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.interviews.configAuthoring(configId),
        });
      }
    },
  });
}

/**
 * POST /teacher/interview-configs/{config_id}/outcomes — add a learning
 * outcome (the §4.3 criteria the AI judges student answers against).
 */
export function useCreateInterviewOutcome(configId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InterviewOutcomeCreate) =>
      apiPost<InterviewOutcomeAuthoring>(
        `/teacher/interview-configs/${configId}/outcomes`,
        payload,
      ),
    onSuccess: () => {
      if (configId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.interviews.configAuthoring(configId),
        });
      }
    },
  });
}

/**
 * PATCH /teacher/interview-configs/{config_id}/outcomes/{outcome_id} —
 * edit an outcome's text / type / importance / position.
 */
export function useUpdateInterviewOutcome(configId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      outcomeId,
      patch,
    }: {
      outcomeId: string;
      patch: Partial<{
        outcome_text: string;
        outcome_type: InterviewOutcomeAuthoring["outcome_type"];
        importance_weight: number;
        position: number;
      }>;
    }) =>
      apiPatch<InterviewOutcomeAuthoring>(
        `/teacher/interview-configs/${configId}/outcomes/${outcomeId}`,
        patch,
      ),
    onSuccess: () => {
      if (configId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.interviews.configAuthoring(configId),
        });
      }
    },
  });
}

/**
 * DELETE /teacher/interview-configs/{config_id}/outcomes/{outcome_id} —
 * soft-delete a single outcome.
 */
export function useDeleteInterviewOutcome(configId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (outcomeId: string) =>
      apiDelete(`/teacher/interview-configs/${configId}/outcomes/${outcomeId}`),
    onSuccess: () => {
      if (configId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.interviews.configAuthoring(configId),
        });
      }
    },
  });
}

/**
 * POST /teacher/interview-configs/{config_id}/generate — kick off an
 * `InterviewGenerationRun`. Returns the run object; poll
 * `useInterviewGenerationRun` until status is completed/failed/cancelled.
 */
export function useGenerateInterviewQuestions(
  configId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InterviewGenerationRequest) =>
      apiPost<InterviewGenerationRunPublic>(
        `/teacher/interview-configs/${configId}/generate`,
        payload,
      ),
    onSuccess: (run) => {
      if (configId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.interviews.generationRun(configId, run.run_id),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.interviews.configAuthoring(configId),
        });
      }
    },
  });
}

/**
 * GET /teacher/interview-configs/{config_id}/generation-runs/{run_id} —
 * status-poll companion to `useGenerateInterviewQuestions`. Polls every 2.5s
 * while the run is pending or running, mirroring the W0.10 quiz pattern.
 */
export function useInterviewGenerationRun(
  configId: string | null | undefined,
  runId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.interviews.generationRun(configId ?? "", runId ?? ""),
    queryFn: () =>
      apiFetch<InterviewGenerationRunPublic>(
        `/teacher/interview-configs/${configId}/generation-runs/${runId}`,
      ),
    enabled: !!configId && !!runId,
    // Keep polling while a run id is active even when a status request
    // transiently fails. Otherwise an exhausted React Query retry leaves the
    // page with no data, stops polling, and strands the generation UI.
    retry: 3,
    retryDelay: 2500,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || status === "pending" || status === "running") return 2500;
      return false;
    },
  });
}

/**
 * GET /teacher/interview-sessions/{session_id}/gap-report — teacher-facing
 * projection (re-introduces raw_evaluation_json, teacher_summary, source links).
 */
export function useTeacherGapReport(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.interviews.teacherGapReport(sessionId ?? ""),
    queryFn: () =>
      apiFetch<GapReportAuthoringRead>(
        `/teacher/interview-sessions/${sessionId}/gap-report`,
      ),
    enabled: !!sessionId,
  });
}

/**
 * PATCH /teacher/interview-sessions/{session_id}/gap-report/notes — save the
 * teacher-authored note (teacher_summary). Returns the refreshed authoring
 * projection; we seed the gap-report cache with it so the UI updates instantly.
 */
export function useSaveGapReportNotes(sessionId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (teacher_summary: string | null) =>
      apiPatch<GapReportAuthoringRead>(
        `/teacher/interview-sessions/${sessionId}/gap-report/notes`,
        { teacher_summary },
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.interviews.teacherGapReport(sessionId ?? ""),
        data,
      );
    },
  });
}

/**
 * GET /teacher/interview-configs/{config_id}/sessions — all student attempts
 * for one interview config (teacher review list).
 */
export function useInterviewSessionsForConfig(
  configId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.interviews.configSessions(configId ?? ""),
    queryFn: () =>
      apiFetch<InterviewSessionSummary[]>(
        `/teacher/interview-configs/${configId}/sessions`,
      ),
    enabled: !!configId,
    refetchInterval: (query) =>
      hasPendingInterviewEvaluation(query.state.data) ? 3000 : false,
  });
}

/**
 * GET /teacher/courses/{course_id}/interview-sessions — every interview
 * session (any student, any config) in a course. Course-wide Assessments tab.
 */
export function useCourseInterviewSessions(
  courseId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.interviews.courseSessions(courseId ?? ""),
    queryFn: () =>
      apiFetch<InterviewSessionTeacherRead[]>(
        `/teacher/courses/${courseId}/interview-sessions`,
      ),
    enabled: !!courseId,
    refetchInterval: (query) =>
      hasPendingInterviewEvaluation(query.state.data) ? 3000 : false,
  });
}

/**
 * Course-scoped interview question bank (§QBank-1).
 * GET /teacher/courses/{course_id}/interview-question-bank
 */
export function useInterviewQuestionBank(courseId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.interviews.questionBank(courseId ?? ""),
    queryFn: () =>
      apiFetch<InterviewQuestionBankItemRead[]>(
        `/teacher/courses/${courseId}/interview-question-bank`,
      ),
    enabled: !!courseId,
  });
}

/**
 * POST /teacher/courses/{course_id}/interview-question-bank — add a reusable
 * question to the course bank (copy semantics).
 */
export function useAddToInterviewQuestionBank(
  courseId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InterviewQuestionBankItemCreate) =>
      apiPost<InterviewQuestionBankItemRead>(
        `/teacher/courses/${courseId}/interview-question-bank`,
        payload,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.interviews.questionBank(courseId ?? ""),
      });
    },
  });
}

/**
 * DELETE /teacher/courses/{course_id}/interview-question-bank/{item_id}
 */
export function useDeleteInterviewQuestionBankItem(
  courseId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiDelete(
        `/teacher/courses/${courseId}/interview-question-bank/${itemId}`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.interviews.questionBank(courseId ?? ""),
      });
    },
  });
}

/**
 * PATCH /teacher/courses/{course_id}/interview-question-bank/{item_id} —
 * edit a bank item (management page).
 */
export function useUpdateInterviewQuestionBankItem(
  courseId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      patch,
    }: {
      itemId: string;
      patch: InterviewQuestionBankItemUpdate;
    }) =>
      apiPatch<InterviewQuestionBankItemRead>(
        `/teacher/courses/${courseId}/interview-question-bank/${itemId}`,
        patch,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.interviews.questionBank(courseId ?? ""),
      });
    },
  });
}

/**
 * GET /teacher/courses/{course_id}/students/{student_id}/interview-sessions —
 * one student's sessions across a course's interview configs.
 */
export function useStudentInterviewSessions(
  courseId: string | null | undefined,
  studentId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.interviews.studentSessions(
      courseId ?? "",
      studentId ?? "",
    ),
    queryFn: () =>
      apiFetch<InterviewSessionTeacherRead[]>(
        `/teacher/courses/${courseId}/students/${studentId}/interview-sessions`,
      ),
    enabled: !!courseId && !!studentId,
    refetchInterval: (query) =>
      hasPendingInterviewEvaluation(query.state.data) ? 3000 : false,
  });
}

/**
 * GET /teacher/interview-sessions/{session_id}/transcript — full ordered Q&A
 * transcript for teacher remediation review.
 */
export function useInterviewTranscript(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.interviews.transcript(sessionId ?? ""),
    queryFn: () =>
      apiFetch<InterviewTranscriptRead>(
        `/teacher/interview-sessions/${sessionId}/transcript`,
      ),
    enabled: !!sessionId,
  });
}

/** One FR-5.8 proctoring signal recorded during an interview session. */
export type InterviewIntegrityEvent = {
  id: string;
  event_type: string;
  severity: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
};

type InterviewIntegrityRead = {
  session_id: string;
  events: InterviewIntegrityEvent[];
};

/**
 * GET /teacher/interview-sessions/{session_id}/integrity-events — FR-5.8
 * proctoring timeline (focus_lost / tab_switch / fullscreen_exit / reconnect /
 * disconnect) for teacher post-session integrity review. Teacher-only.
 */
export function useInterviewIntegrityEvents(
  sessionId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.interviews.integrityEvents(sessionId ?? ""),
    queryFn: () =>
      apiFetch<InterviewIntegrityRead>(
        `/teacher/interview-sessions/${sessionId}/integrity-events`,
      ),
    enabled: !!sessionId,
  });
}

/**
 * GET /teacher/interview-sessions/{session_id} — read-only session detail,
 * course-scoped teacher access (require_session_authoring_access).
 *
 * The student-facing GET /interview-sessions/{id} is owner-only and 403s for
 * a teacher — this hook used to call that one by mistake. Surfaced under a
 * separate query key so teacher invalidations don't churn learner caches.
 */
export function useTeacherInterviewSession(
  sessionId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.interviews.teacherSession(sessionId ?? ""),
    queryFn: () =>
      apiFetch<InterviewSessionPublic>(
        `/teacher/interview-sessions/${sessionId}`,
      ),
    enabled: !!sessionId,
  });
}

/**
 * POST /interview-sessions/{session_id}/realtime-token
 * Fetches a short-lived LiveKit participant token for voice mode.
 * Errors: 503 voice disabled, 409 wrong mode/status, 403/404 ownership/missing.
 */
export function useInterviewRealtimeToken(
  sessionId: string | null | undefined,
) {
  const { i18n } = useTranslation();
  return useMutation({
    /**
     * `warm: true` mints a token that opens the room WITHOUT dispatching the
     * interviewer, and is accepted mid-onboarding. It exists so the room can be
     * joined during setup: the LiveKit worker takes ~10-13s to start, and that
     * used to be dead air in front of question one because minting a token was
     * the same act as starting the agent. The agent is sent in afterwards by
     * `useDispatchInterviewAgent`.
     */
    mutationFn: (opts?: { warm?: boolean }) =>
      apiPost<RealtimeTokenResponse>(
        `/interview-sessions/${sessionId}/realtime-token${opts?.warm ? "?warm=true" : ""}`,
        undefined,
        // Send the in-app language so the voice agent's adaptive utterances
        // match the UI locale (parity with the /respond REST path). The backend
        // normalizes this Accept-Language header to "vi"/"en".
        { "Accept-Language": i18n.language || "en" },
      ),
  });
}

/**
 * Send the interviewer into a room the candidate already warmed.
 *
 * The second half of the warm-room flow. The backend refuses this until
 * `onboarding_stage === "completed"` — that gate did not disappear when warm
 * tokens were allowed early, it moved here, because THIS is the call that
 * starts the interview.
 *
 * Errors: 409 onboarding incomplete / no room open, 502 dispatch failed (the
 * caller should fall back to a normal dispatching token rather than leave the
 * candidate in a room with nobody in it).
 */
export function useDispatchInterviewAgent(
  sessionId: string | null | undefined,
) {
  return useMutation({
    mutationFn: () =>
      apiPost<RealtimeAgentDispatchResponse>(
        `/interview-sessions/${sessionId}/realtime-agent`,
      ),
  });
}

/**
 * POST /interview-sessions/{session_id}/integrity-events
 * Batch-posts proctoring/integrity signals. Max 50 events per call.
 * Never throws into the UI — errors are silently swallowed at the call site.
 */
export function useReportIntegrityEvents(sessionId: string | null | undefined) {
  return useMutation({
    mutationFn: (body: IntegrityEventsRequest) =>
      apiPost<IntegrityEventsResponse>(
        `/interview-sessions/${sessionId}/integrity-events`,
        body,
      ),
  });
}

export type { InterviewForTakingPublic };
