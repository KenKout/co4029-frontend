import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import i18n from "@/i18n";
import {
  apiDelete,
  apiFetch,
  apiGetResponse,
  apiPatch,
  apiPost,
  apiPut,
} from "../client";
import { ApiError } from "../client";
import { queryKeys } from "../query-keys";
import { useInfinitePage } from "../use-infinite-page";
import type {
  BulkSetExpectedTimeRequest,
  BulkSetExpectedTimeResponse,
  GenerationRunRead,
  QuestionBankEntry,
  QuestionBankImportRequest,
  QuizAttemptAnswerRead,
  QuizAttemptRead,
  QuizAttemptReviewQuestion,
  QuizAttemptReviewRead,
  QuizAttemptStart,
  QuizAttemptSubmitAnswer,
  QuizAttemptTeacherRead,
  QuizAuthoring,
  QuizForAuthoringPublic,
  QuizForTakingPublic,
  QuizPublic,
  QuizQuestionAuthoring,
  QuizResultsRead,
} from "../types";

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

/**
 * Resume payload for an in-progress attempt. Declared locally (not in
 * `types.ts`) because this endpoint post-dates the committed OpenAPI
 * snapshot — mirrors backend `QuizAttemptProgressRead` /
 * `QuizAttemptProgressAnswer` (no-leak: no is_correct / points_awarded).
 */
export interface QuizAttemptProgressAnswer {
  question_id: string;
  selected_option_id: string | null;
  answer_text: string | null;
  hint_used: boolean;
  t_actual_ms: number | null;
}

export interface QuizAttemptProgressRead {
  attempt_id: string;
  quiz_id: string;
  status: "in_progress" | "submitted" | "graded" | "abandoned" | "expired";
  started_at: string;
  take: QuizForTakingPublic;
  answers: QuizAttemptProgressAnswer[];
}

const TERMINAL_GENERATION_STATUSES = new Set([
  "completed",
  "succeeded",
  "failed",
  "cancelled",
]);

export function useStudentQuiz(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.detail(quizId ?? ""),
    queryFn: () => apiFetch<QuizPublic>(`/quizzes/${quizId}`),
    enabled: !!quizId,
  });
}

/** Teacher: every quiz attempt across every quiz in a course. */
export function useCourseQuizAttempts(courseId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.courseAttempts(courseId ?? ""),
    queryFn: () =>
      apiFetch<QuizAttemptTeacherRead[]>(
        `/teacher/courses/${courseId}/quiz-attempts`,
      ),
    enabled: !!courseId,
  });
}

/**
 * Teacher-facing per-attempt detail. The endpoint
 * (`GET /teacher/courses/{courseId}/quiz-attempts/{attemptId}`) post-dates
 * the committed OpenAPI snapshot, so types are declared locally following
 * this file's convention.
 */
export interface QuizAttemptIntegrityEvent {
  id: string;
  event_type: string;
  severity: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface QuizAttemptTeacherReview {
  attempt: QuizAttemptTeacherRead;
  questions: QuizAttemptReviewQuestion[];
  integrity_events: QuizAttemptIntegrityEvent[];
}

export function useCourseQuizAttemptDetail(
  courseId: string | null | undefined,
  attemptId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.quizzes.attemptDetail(courseId ?? "", attemptId ?? ""),
    queryFn: () =>
      apiFetch<QuizAttemptTeacherReview>(
        `/teacher/courses/${courseId}/quiz-attempts/${attemptId}`,
      ),
    enabled: !!courseId && !!attemptId,
  });
}

/** Teacher: one student's quiz attempts across a course's quizzes. */
export function useStudentQuizAttempts(
  courseId: string | null | undefined,
  studentId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.quizzes.studentAttempts(
      courseId ?? "",
      studentId ?? "",
    ),
    queryFn: () =>
      apiFetch<QuizAttemptTeacherRead[]>(
        `/teacher/courses/${courseId}/students/${studentId}/quiz-attempts`,
      ),
    enabled: !!courseId && !!studentId,
  });
}

export function useStartQuizAttempt(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: Partial<QuizAttemptStart>) =>
      apiPost<QuizAttemptProgressRead>(`/quizzes/${quizId}/attempts`, {
        quiz_id: quizId ?? "",
        ...body,
      }),
    onSuccess: () => {
      if (quizId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.myAttempts(quizId),
        });
      }
    },
  });
}

/**
 * Resume payload for an in-progress attempt — rehydrates the take payload
 * (quiz + questions) plus every answer saved so far. Pairs with
 * `useStartQuizAttempt`, which returns the same shape for a fresh attempt.
 */
export function useQuizAttemptProgress(attemptId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.attemptProgress(attemptId ?? ""),
    queryFn: () =>
      apiFetch<QuizAttemptProgressRead>(`/attempts/${attemptId}/progress`),
    enabled: !!attemptId,
  });
}

export function useSubmitQuizAnswer(attemptId: string | null | undefined) {
  return useMutation({
    mutationFn: (payload: QuizAttemptSubmitAnswer) =>
      apiPost<QuizAttemptAnswerRead>(`/attempts/${attemptId}/answers`, payload),
  });
}

export function useSubmitQuizAttempt(attemptId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<QuizAttemptRead>(`/attempts/${attemptId}/submit`),
    onSuccess: (attempt) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.quizzes.attempt(attempt.id),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.quizzes.myAttempts(attempt.quiz_id),
      });
    },
  });
}

export function useQuizAttempt(attemptId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.attempt(attemptId ?? ""),
    queryFn: () => apiFetch<QuizAttemptRead>(`/attempts/${attemptId}`),
    enabled: !!attemptId,
  });
}

export function useMyQuizAttempts(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.myAttempts(quizId ?? ""),
    queryFn: () =>
      apiFetch<QuizAttemptRead[]>(`/me/quizzes/${quizId}/attempts`),
    enabled: !!quizId,
  });
}

export function useQuizAttemptReview(attemptId: string | null | undefined) {
  return useQuery({
    queryKey: ["quizzes", "attempt-review", attemptId ?? ""],
    queryFn: () =>
      apiFetch<QuizAttemptReviewRead>(`/attempts/${attemptId}/review`),
    enabled: !!attemptId,
    staleTime: 1000 * 60 * 10, // submitted attempts don't change
  });
}

export function useQuizAuthoring(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.authoring(quizId ?? ""),
    queryFn: () =>
      apiFetch<QuizForAuthoringPublic>(`/teacher/quizzes/${quizId}`),
    enabled: !!quizId,
  });
}

/**
 * Teacher-facing per-quiz results & analytics
 * (`GET /teacher/quizzes/{quizId}/results`): grading-method-aware summary
 * (mean/median/quartiles/pass-rate/histogram), per-student rollup, and
 * per-question breakdown. Powers the quiz results dashboard.
 */
export function useQuizResults(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.results(quizId ?? ""),
    queryFn: () =>
      apiFetch<QuizResultsRead>(`/teacher/quizzes/${quizId}/results`),
    enabled: !!quizId,
  });
}

export function useCreateQuiz(courseId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPost<QuizAuthoring>(`/teacher/courses/${courseId}/quizzes`, payload),
    onSuccess: (quiz) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.quizzes.authoring(quiz.id),
      });
      if (courseId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.courses.content(courseId),
        });
      }
    },
  });
}

export function usePatchQuiz(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPatch<QuizAuthoring>(`/teacher/quizzes/${quizId}`, payload),
    onSuccess: (quiz) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.quizzes.authoring(quiz.id),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.courses.content(quiz.course_id),
      });
    },
  });
}

const PUBLISH_MISSING_TEXP_KEY =
  "teacher_quiz_manage.errors.publish_missing_t_exp";

export function usePublishQuiz(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiPost<QuizAuthoring>(`/teacher/quizzes/${quizId}/publish`),
    onSuccess: (quiz) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.quizzes.authoring(quiz.id),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.courses.content(quiz.course_id),
      });
    },
    onError: (err: unknown) => {
      if (
        err instanceof ApiError &&
        err.status === 422 &&
        (err.code === "missing_t_exp" ||
          err.code === "missing_expected_response_time" ||
          err.code === "missing_expected_time")
      ) {
        toast.error(i18n.t(PUBLISH_MISSING_TEXP_KEY));
      }
    },
  });
}

export function useDeleteQuiz(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiDelete(`/teacher/quizzes/${quizId}`),
    onSuccess: () => {
      if (quizId) {
        qc.removeQueries({ queryKey: queryKeys.quizzes.authoring(quizId) });
        qc.removeQueries({ queryKey: queryKeys.quizzes.questions(quizId) });
      }
    },
  });
}

export function useAddQuizQuestion(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPost<QuizQuestionAuthoring>(
        `/teacher/quizzes/${quizId}/questions`,
        payload,
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

export function useUpdateQuizQuestion(
  quizId: string | null | undefined,
  questionId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPatch<QuizQuestionAuthoring>(
        `/teacher/quizzes/${quizId}/questions/${questionId}`,
        payload,
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

export function useDeleteQuizQuestion(
  quizId: string | null | undefined,
  questionId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiDelete(`/teacher/quizzes/${quizId}/questions/${questionId}`),
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

export function useRegenerateQuestion(
  quizId: string | null | undefined,
  questionId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiPost<GenerationRunRead>(
        `/teacher/quizzes/${quizId}/questions/${questionId}/regenerate`,
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

export function useBulkSetExpectedTime(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      question_ids,
      expected_seconds,
    }: {
      question_ids: string[];
      expected_seconds: number;
    }) => {
      if (question_ids.length === 0) {
        throw new Error(
          i18n.t("teacher_quiz_manage.errors.bulk_select_required"),
        );
      }
      if (!Number.isFinite(expected_seconds) || expected_seconds <= 0) {
        throw new Error(
          i18n.t("teacher_quiz_manage.errors.bulk_seconds_positive"),
        );
      }
      const body: BulkSetExpectedTimeRequest = {
        items: question_ids.map((qid) => ({
          question_id: qid,
          expected_response_time_ms: Math.round(expected_seconds * 1000),
        })),
      };
      return apiPost<BulkSetExpectedTimeResponse>(
        `/teacher/quizzes/${quizId}/questions/bulk-set-expected-time`,
        body,
      );
    },
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

/**
 * Bulk-approve questions (flip review_status → 'approved' for many at once).
 * The teacher's bulk sign-off for AI-generated content.
 */
export function useBulkApprove(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ question_ids }: { question_ids: string[] }) => {
      if (question_ids.length === 0) {
        throw new Error(
          i18n.t("teacher_quiz_manage.errors.bulk_select_required"),
        );
      }
      return apiPost<{ approved: number }>(
        `/teacher/quizzes/${quizId}/questions/bulk-approve`,
        { question_ids },
      );
    },
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

/**
 * Question bank — cursor-paginated authored questions across the course.
 *
 * Default ``review_status='approved'`` filters out drafts; pass
 * ``reviewStatus: ""`` to widen. ``excludeQuizId`` is convenient when
 * launched from a target quiz so its own questions don't reappear.
 *
 * Returns flattened `items[]` plus infinite-scroll handles. The modal
 * pairs this with `<InfiniteList>` so the list auto-loads on scroll.
 */
export function useQuestionBank(
  courseId: string | null | undefined,
  filters: {
    moduleId?: string;
    lessonId?: string;
    questionType?: string;
    bloomLevel?: string;
    difficulty?: string;
    reviewStatus?: string;
    search?: string;
    excludeQuizId?: string;
  } = {},
  options: { enabled?: boolean; limit?: number } = {},
) {
  const enabled = (options.enabled ?? true) && !!courseId;
  const limit = options.limit ?? 50;
  return useInfinitePage<QuestionBankEntry>({
    queryKey: queryKeys.quizzes.bank(courseId ?? "", filters),
    fetch: async (cursor, pageLimit = limit) => {
      const params = new URLSearchParams();
      if (filters.moduleId) params.set("module_id", filters.moduleId);
      if (filters.lessonId) params.set("lesson_id", filters.lessonId);
      if (filters.questionType)
        params.set("question_type", filters.questionType);
      if (filters.bloomLevel) params.set("bloom_level", filters.bloomLevel);
      if (filters.difficulty) params.set("difficulty", filters.difficulty);
      if (filters.reviewStatus !== undefined) {
        params.set("review_status", filters.reviewStatus);
      }
      if (filters.search) params.set("search", filters.search);
      if (filters.excludeQuizId) {
        params.set("exclude_quiz_id", filters.excludeQuizId);
      }
      if (pageLimit) params.set("limit", String(pageLimit));
      if (cursor) params.set("cursor", cursor);
      const qs = params.toString();
      const page = await apiFetch<{
        items: QuestionBankEntry[];
        next_cursor: string | null;
      }>(`/teacher/courses/${courseId}/question-bank${qs ? `?${qs}` : ""}`);
      return { items: page.items, next_cursor: page.next_cursor ?? null };
    },
    limit,
    enabled,
  });
}

export function useImportQuestionsFromBank(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sourceQuestionIds: string[]) => {
      if (!quizId) throw new Error("quizId is required");
      const body: QuestionBankImportRequest = {
        source_question_ids: sourceQuestionIds,
      };
      return apiPost<QuizQuestionAuthoring[]>(
        `/teacher/quizzes/${quizId}/questions/import`,
        body,
      );
    },
    onSuccess: () => {
      if (quizId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.authoring(quizId),
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.questions(quizId),
        });
      }
      void qc.invalidateQueries({ queryKey: ["quizzes", "bank"] });
    },
  });
}

/** One question staged for deferred deletion. */
export interface PendingQuestionDelete {
  id: string;
  /** Label for the undo banner (question prompt snippet). */
  label: string;
}

export interface UsePendingQuestionDeletesResult {
  /** IDs currently staged (hidden from the list, not yet deleted). */
  pendingIds: Set<string>;
  /** Number of questions in the active combo. */
  comboCount: number;
  /** Whole seconds left before the combo commits. 0 when idle. */
  secondsLeft: number;
  /** Stage a question for deletion; refreshes the combo timer. */
  queueDelete: (item: PendingQuestionDelete) => void;
  /** Cancel the whole combo — nothing was deleted server-side. */
  undo: () => void;
  /** Commit immediately (skip the countdown). */
  flushNow: () => void;
}

/**
 * Combo-undo for quiz-question deletion (QoL, teacher quiz editor).
 *
 * Rather than hitting the DELETE endpoint immediately, deletes are
 * *deferred*: the question is optimistically hidden and staged in a combo
 * batch. Each additional delete within the window refreshes a single 5s
 * countdown (gaming-combo style) and stacks into the same batch. The undo
 * button clears the whole batch — because nothing was sent to the server
 * yet, undo is free and reliable (no restore endpoint required). When the
 * countdown expires — or the component unmounts (navigation away) — the
 * staged deletes are flushed for real and the authoring queries are
 * invalidated.
 *
 * The DELETE route is per-question (soft-delete server-side); the batch
 * fires them concurrently and tolerates partial failure.
 */
export function usePendingQuestionDeletes(
  quizId: string | null | undefined,
  windowMs = 5000,
): UsePendingQuestionDeletesResult {
  const qc = useQueryClient();
  const [pending, setPending] = useState<Map<string, PendingQuestionDelete>>(
    new Map(),
  );
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Refs so the unmount flush sees the latest staged set / quizId without
  // re-subscribing the cleanup effect on every change.
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const quizIdRef = useRef(quizId);
  quizIdRef.current = quizId;

  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadline = useRef<number>(0);

  const clearTimers = useCallback(() => {
    if (commitTimer.current) {
      clearTimeout(commitTimer.current);
      commitTimer.current = null;
    }
    if (tickTimer.current) {
      clearInterval(tickTimer.current);
      tickTimer.current = null;
    }
  }, []);

  const invalidate = useCallback(() => {
    const qid = quizIdRef.current;
    if (!qid) return;
    void qc.invalidateQueries({ queryKey: queryKeys.quizzes.authoring(qid) });
    void qc.invalidateQueries({ queryKey: queryKeys.quizzes.questions(qid) });
  }, [qc]);

  // Fire the real DELETE calls for a set of ids. Concurrent, partial-failure
  // tolerant. Not dependent on React state so it can run during unmount.
  const commit = useCallback(
    async (ids: string[]) => {
      const qid = quizIdRef.current;
      if (!qid || ids.length === 0) return;
      const results = await Promise.allSettled(
        ids.map((id) => apiDelete(`/teacher/quizzes/${qid}/questions/${id}`)),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        toast.error(
          i18n.t("teacher_quiz_manage.toasts.delete_question_failed"),
        );
      }
      invalidate();
    },
    [invalidate],
  );

  const undo = useCallback(() => {
    clearTimers();
    setPending(new Map());
    setSecondsLeft(0);
  }, [clearTimers]);

  const flushNow = useCallback(() => {
    clearTimers();
    const ids = [...pendingRef.current.keys()];
    setPending(new Map());
    setSecondsLeft(0);
    void commit(ids);
  }, [clearTimers, commit]);

  const queueDelete = useCallback(
    (item: PendingQuestionDelete) => {
      setPending((prev) => {
        const next = new Map(prev);
        next.set(item.id, item);
        return next;
      });
      // Refresh the combo: reset both the commit timer and the countdown.
      clearTimers();
      deadline.current = Date.now() + windowMs;
      setSecondsLeft(Math.ceil(windowMs / 1000));
      tickTimer.current = setInterval(() => {
        const remainingMs = deadline.current - Date.now();
        setSecondsLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
      }, 250);
      commitTimer.current = setTimeout(() => {
        clearTimers();
        const ids = [...pendingRef.current.keys()];
        setPending(new Map());
        setSecondsLeft(0);
        void commit(ids);
      }, windowMs);
    },
    [clearTimers, commit, windowMs],
  );

  // On unmount (e.g. teacher navigates away mid-combo), flush staged deletes
  // so the intent isn't silently lost. Runs once.
  useEffect(() => {
    return () => {
      const ids = [...pendingRef.current.keys()];
      if (ids.length > 0) {
        if (commitTimer.current) clearTimeout(commitTimer.current);
        if (tickTimer.current) clearInterval(tickTimer.current);
        void commit(ids);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    pendingIds: new Set(pending.keys()),
    comboCount: pending.size,
    secondsLeft,
    queueDelete,
    undo,
    flushNow,
  };
}

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
      apiPost<RegradeRunRead>(`/teacher/quizzes/${quizId}/regrade/commit`, scope),
    onSuccess: () => {
      if (quizId) {
        void qc.invalidateQueries({ queryKey: queryKeys.quizzes.results(quizId) });
        void qc.invalidateQueries({ queryKey: queryKeys.quizzes.gradebook(quizId) });
      }
    },
  });
}

// --- Phase 2: review-visibility --------------------------------------------
export interface ReviewOptions {
  show_score: boolean;
  show_correct_answers: boolean;
  show_feedback: boolean;
  show_explanation: boolean;
  show_points: boolean;
  during_attempt?: boolean;
  immediately_after?: boolean;
  later_while_open?: boolean;
  after_close?: boolean;
}

// --- Phase 4: manual grading -----------------------------------------------
export interface NeedsGradingRow {
  answer_id: string;
  attempt_id: string;
  question_id: string;
  student_id: string;
  question_type: string;
  prompt_text: string;
  answer_text: string | null;
  submitted_at: string | null;
}
export interface ManualGradeIn {
  score: number;
  feedback?: string | null;
}

export function useNeedsGrading(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.needsGrading(quizId ?? ""),
    queryFn: () =>
      apiFetch<NeedsGradingRow[]>(`/teacher/quizzes/${quizId}/needs-grading`),
    enabled: !!quizId,
  });
}

export function useGradeAnswer(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ answerId, body }: { answerId: string; body: ManualGradeIn }) =>
      apiPatch(`/teacher/quizzes/${quizId}/answers/${answerId}/grade`, body),
    onSuccess: () => {
      if (quizId) {
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.needsGrading(quizId),
        });
        void qc.invalidateQueries({ queryKey: queryKeys.quizzes.gradebook(quizId) });
      }
    },
  });
}

// --- Phase 5: overrides -----------------------------------------------------
export interface QuizOverrideIn {
  scope: "user" | "group";
  user_id?: string | null;
  group_id?: string | null;
  available_from?: string | null;
  available_until?: string | null;
  due_at?: string | null;
  time_limit_seconds?: number | null;
  max_attempts?: number | null;
  allow_retakes?: boolean | null;
  cooldown_hours?: number | null;
}
export interface QuizOverrideRead extends QuizOverrideIn {
  id: string;
  quiz_id: string;
}

export function useQuizOverrides(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.overrides(quizId ?? ""),
    queryFn: () =>
      apiFetch<QuizOverrideRead[]>(`/teacher/quizzes/${quizId}/overrides`),
    enabled: !!quizId,
  });
}

export function useCreateOverride(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: QuizOverrideIn) =>
      apiPost<QuizOverrideRead>(`/teacher/quizzes/${quizId}/overrides`, body),
    onSuccess: () => {
      if (quizId)
        void qc.invalidateQueries({ queryKey: queryKeys.quizzes.overrides(quizId) });
    },
  });
}

export function useDeleteOverride(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (overrideId: string) =>
      apiDelete(`/teacher/quizzes/${quizId}/overrides/${overrideId}`),
    onSuccess: () => {
      if (quizId)
        void qc.invalidateQueries({ queryKey: queryKeys.quizzes.overrides(quizId) });
    },
  });
}

// --- Phase 8: feedback bands -----------------------------------------------
export interface FeedbackBandIn {
  min_grade: number;
  max_grade: number;
  feedback_text: string;
  feedback_format?: string;
}
export interface FeedbackBandRead extends FeedbackBandIn {
  id: string;
  quiz_id: string;
}

export function useFeedbackBands(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.feedbackBands(quizId ?? ""),
    queryFn: () =>
      apiFetch<FeedbackBandRead[]>(`/teacher/quizzes/${quizId}/feedback-bands`),
    enabled: !!quizId,
  });
}

export function useSetFeedbackBands(quizId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bands: FeedbackBandIn[]) =>
      apiPut<FeedbackBandRead[]>(`/teacher/quizzes/${quizId}/feedback-bands`, {
        bands,
      }),
    onSuccess: () => {
      if (quizId)
        void qc.invalidateQueries({
          queryKey: queryKeys.quizzes.feedbackBands(quizId),
        });
    },
  });
}

// --- Phase 9: gradebook -----------------------------------------------------
export interface QuizGradeRow {
  student_id: string;
  grade_percent: number;
  grade_points: number;
  passed: boolean;
  grading_method: string;
  based_on_attempt_id: string | null;
  attempts_counted: number;
}

export function useQuizGradebook(quizId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.quizzes.gradebook(quizId ?? ""),
    queryFn: () =>
      apiFetch<QuizGradeRow[]>(`/teacher/quizzes/${quizId}/gradebook`),
    enabled: !!quizId,
  });
}

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

/** Filename from a Content-Disposition header, or a fallback. */
function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const match = /filename="?([^"]+)"?/.exec(header);
  return match ? match[1] : fallback;
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
    mutationFn: ({ content, format }: { content: string; format: "gift" | "xml" }) =>
      apiPost<ImportResult>(`/teacher/quizzes/${quizId}/questions/import-file`, {
        content,
        format,
      }),
    onSuccess: () => {
      if (quizId) {
        void qc.invalidateQueries({ queryKey: queryKeys.quizzes.authoring(quizId) });
        void qc.invalidateQueries({ queryKey: queryKeys.quizzes.questions(quizId) });
      }
    },
  });
}

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
