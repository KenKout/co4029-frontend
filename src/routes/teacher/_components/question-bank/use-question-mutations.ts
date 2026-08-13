import { useState } from "react";
import { toast } from "sonner";

import type { InterviewQuestionAuthoring } from "@/lib/api/types";
import { statusMeta } from "./helpers";
import type {
  DeleteQuestionMutation,
  OutcomeMeta,
  ReviewStatus,
  TranslateFn,
  UpdateQuestionMutation,
} from "./types";

/**
 * Per-question mutations for the Question Bank (status, outcome, practice
 * partition, approve-all, delete), extracted from the former 2.4k-line
 * question-bank.tsx. Owns the in-flight markers the cards render from:
 * `savingId`, `deletingIds` and `approvingAll`.
 *
 * The action bodies live at module scope and take the render-scoped `ctx`, so
 * each one still reads the current render's values exactly as the original
 * in-component functions did.
 */
export interface QuestionMutationsOptions {
  updateQuestion: UpdateQuestionMutation;
  deleteQuestion: DeleteQuestionMutation;
  pendingQuestions: InterviewQuestionAuthoring[];
  outcomeById: Map<string, OutcomeMeta>;
  announce: (msg: string) => void;
  t: TranslateFn;
}

interface MutationCtx extends QuestionMutationsOptions {
  approvingAll: boolean;
  setApprovingAll: React.Dispatch<React.SetStateAction<boolean>>;
  deletingIds: Set<string>;
  setDeletingIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSavingId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useQuestionMutations(options: QuestionMutationsOptions) {
  const [approvingAll, setApprovingAll] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const ctx: MutationCtx = {
    ...options,
    approvingAll,
    setApprovingAll,
    deletingIds,
    setDeletingIds,
    setSavingId,
  };
  return {
    approvingAll,
    deletingIds,
    setDeletingIds,
    savingId,
    setSavingId,
    setStatus: (q: InterviewQuestionAuthoring, next: ReviewStatus) =>
      setStatus(ctx, q, next),
    setOutcome: (q: InterviewQuestionAuthoring, next: string | null) =>
      setOutcome(ctx, q, next),
    handleApproveAll: () => handleApproveAll(ctx),
    handleDelete: (q: InterviewQuestionAuthoring) => handleDelete(ctx, q),
  };
}

async function setStatus(
  ctx: MutationCtx,
  q: InterviewQuestionAuthoring,
  next: ReviewStatus,
) {
  const { updateQuestion, announce, t, setSavingId } = ctx;
  if (q.review_status === next) return;
  const prev = q.review_status;
  setSavingId(q.id);
  try {
    await updateQuestion.mutateAsync({
      questionId: q.id,
      patch: { review_status: next },
    });
    announce(
      t("teacher_interview_config.qbank.sr.status_changed", {
        status: t(
          `teacher_interview_config.qbank.status.${statusMeta(next).key}`,
        ),
      }),
    );
    toast.success(
      t("teacher_interview_config.qbank.toasts.status_changed", {
        status: t(
          `teacher_interview_config.qbank.status.${statusMeta(next).key}`,
        ),
      }),
      {
        action: {
          label: t("common.undo"),
          onClick: () => {
            void updateQuestion.mutateAsync({
              questionId: q.id,
              patch: { review_status: prev },
            });
          },
        },
      },
    );
  } catch (err: unknown) {
    toast.error(
      (err as Error).message ||
        t("teacher_interview_config.toasts.question_approve_failed"),
    );
  } finally {
    setSavingId(null);
  }
}

// ── Outcome assignment (inline, with toast + undo) ──────────────────────────
async function setOutcome(
  ctx: MutationCtx,
  q: InterviewQuestionAuthoring,
  next: string | null,
) {
  const { updateQuestion, outcomeById, announce, t, setSavingId } = ctx;
  const current = q.linked_outcome_id ?? null;
  if (current === next) return;
  const nextLabel = next
    ? (outcomeById.get(next)?.label ?? "")
    : t("teacher_interview_config.qbank.no_outcome_option");
  setSavingId(q.id);
  try {
    await updateQuestion.mutateAsync({
      questionId: q.id,
      patch: { linked_outcome_id: next },
    });
    announce(
      t("teacher_interview_config.qbank.sr.outcome_changed", {
        outcome: nextLabel,
      }),
    );
    toast.success(
      t("teacher_interview_config.qbank.toasts.outcome_changed", {
        outcome: nextLabel,
      }),
      {
        action: {
          label: t("common.undo"),
          onClick: () => {
            void updateQuestion.mutateAsync({
              questionId: q.id,
              patch: { linked_outcome_id: current },
            });
          },
        },
      },
    );
  } catch (err: unknown) {
    toast.error((err as Error).message);
  } finally {
    setSavingId(null);
  }
}

async function handleApproveAll(ctx: MutationCtx) {
  const { updateQuestion, pendingQuestions, approvingAll, setApprovingAll, t } =
    ctx;
  if (pendingQuestions.length === 0 || approvingAll) return;
  setApprovingAll(true);
  try {
    const results = await Promise.allSettled(
      pendingQuestions.map((q) =>
        updateQuestion.mutateAsync({
          questionId: q.id,
          patch: { review_status: "approved" },
        }),
      ),
    );
    const failedCount = results.filter((r) => r.status === "rejected").length;
    const okCount = results.length - failedCount;
    if (failedCount === 0) {
      toast.success(
        t("teacher_interview_config.toasts.all_questions_approved", {
          count: okCount,
        }),
      );
    } else if (okCount > 0) {
      toast.error(
        t("teacher_interview_config.toasts.approve_all_partial", {
          approved: okCount,
          failed: failedCount,
        }),
      );
    } else {
      toast.error(t("teacher_interview_config.toasts.approve_all_failed"));
    }
  } finally {
    setApprovingAll(false);
  }
}

// ── Delete (fade + collapse exit, then PATCH) ───────────────────────────────
async function handleDelete(ctx: MutationCtx, q: InterviewQuestionAuthoring) {
  const { deleteQuestion, deletingIds, setDeletingIds, t } = ctx;
  if (deletingIds.has(q.id)) return;
  setDeletingIds((prev) => new Set(prev).add(q.id));
  await new Promise((resolve) => setTimeout(resolve, 280));
  try {
    await deleteQuestion.mutateAsync(q.id);
    toast.success(t("teacher_interview_config.toasts.question_deleted"));
  } catch (err: unknown) {
    toast.error((err as Error).message);
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(q.id);
      return next;
    });
  }
}
