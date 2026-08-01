import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import i18n from "@/i18n";
import { apiDelete } from "../../client";
import { queryKeys } from "../../query-keys";

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
  // Ids whose DELETE is in flight (or whose refetch hasn't landed yet).
  //
  // Without this the list flickers: the commit path cleared `pending` BEFORE
  // the DELETE requests resolved, so the rows unhid while the server still
  // returned them (they reappeared), then vanished again once the invalidated
  // query refetched. Keeping the ids in a second set until the refetch settles
  // means a staged row is hidden continuously from click to final state.
  const [inFlight, setInFlight] = useState<Set<string>>(() => new Set());

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

  const invalidate = useCallback(async () => {
    const qid = quizIdRef.current;
    if (!qid) return;
    // Awaited so callers can keep rows hidden until fresh data has landed.
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.quizzes.authoring(qid) }),
      qc.invalidateQueries({ queryKey: queryKeys.quizzes.questions(qid) }),
    ]);
  }, [qc]);

  // Fire the real DELETE calls for a set of ids. Concurrent, partial-failure
  // tolerant. Not dependent on React state so it can run during unmount.
  const commit = useCallback(
    async (ids: string[]) => {
      const qid = quizIdRef.current;
      if (!qid || ids.length === 0) return;
      // Hold the rows hidden across the request + refetch so they can't
      // reappear in the gap between the countdown ending and the server
      // actually reflecting the deletion.
      setInFlight((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        return next;
      });
      try {
        const results = await Promise.allSettled(
          ids.map((id) => apiDelete(`/teacher/quizzes/${qid}/questions/${id}`)),
        );
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0) {
          toast.error(
            i18n.t("teacher_quiz_manage.toasts.delete_question_failed"),
          );
        }
        await invalidate();
      } finally {
        // Release only after fresh data is in the cache. A failed DELETE also
        // releases, so the row correctly comes back (it still exists).
        setInFlight((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.delete(id);
          return next;
        });
      }
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
  }, []);

  return {
    // Union of staged (countdown running) and in-flight (DELETE + refetch)
    // ids. Both must stay hidden, otherwise a row reappears in the gap
    // between the countdown ending and the server reflecting the delete.
    pendingIds: new Set([...pending.keys(), ...inFlight]),
    // Only the staged batch drives the undo snackbar — once the commit fires
    // it can no longer be undone, so the banner must disappear.
    comboCount: pending.size,
    secondsLeft,
    queueDelete,
    undo,
    flushNow,
  };
}
