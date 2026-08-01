import { useState } from "react";
import { toast } from "sonner";

import type { InterviewQuestionAuthoring } from "@/lib/api/types";
import type {
  AddToBankMutation,
  ConfirmFn,
  DeleteQuestionMutation,
  ReviewStatus,
  TranslateFn,
  UpdateQuestionMutation,
} from "./types";

/**
 * Bulk actions over the current selection, extracted from the former 2.4k-line
 * question-bank.tsx. All actions reuse the same mutations as the
 * single-question controls, so behaviour stays consistent. `bulkBusy` guards
 * the contextual action bar while a batch mutation runs.
 */
export interface BulkActionsOptions {
  configId: string;
  selectedQuestions: InterviewQuestionAuthoring[];
  clearSelection: () => void;
  updateQuestion: UpdateQuestionMutation;
  deleteQuestion: DeleteQuestionMutation;
  addToBank: AddToBankMutation;
  bankedPrompts: Set<string>;
  setDeletingIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  confirmAction: ConfirmFn;
  t: TranslateFn;
}

export function useBulkActions(options: BulkActionsOptions) {
  const {
    configId,
    selectedQuestions,
    clearSelection,
    updateQuestion,
    deleteQuestion,
    addToBank,
    bankedPrompts,
    setDeletingIds,
    confirmAction,
    t,
  } = options;
  const [bulkBusy, setBulkBusy] = useState(false);

  // Run a PATCH over every selected question, report a combined toast, and
  // clear selection. Used by set-status / set-outcome bulk actions.
  async function bulkPatch(
    patch: Partial<{
      review_status: ReviewStatus;
      linked_outcome_id: string | null;
    }>,
    successKey: string,
  ) {
    const targets = selectedQuestions;
    if (targets.length === 0 || bulkBusy) return;
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(
        targets.map((q) =>
          updateQuestion.mutateAsync({ questionId: q.id, patch }),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      const ok = results.length - failed;
      if (failed === 0) {
        toast.success(t(successKey, { count: ok }));
      } else if (ok > 0) {
        toast.error(
          t("teacher_interview_config.qbank.bulk.partial", {
            ok,
            failed,
          }),
        );
      } else {
        toast.error(t("teacher_interview_config.qbank.bulk.failed"));
      }
      clearSelection();
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkSetStatus(next: ReviewStatus) {
    await bulkPatch(
      { review_status: next },
      "teacher_interview_config.qbank.bulk.status_done",
    );
  }
  async function bulkSetOutcome(next: string | null) {
    await bulkPatch(
      { linked_outcome_id: next },
      "teacher_interview_config.qbank.bulk.outcome_done",
    );
  }
  async function bulkAddToBank() {
    const targets = selectedQuestions;
    if (targets.length === 0 || bulkBusy) return;
    setBulkBusy(true);
    try {
      let ok = 0;
      let failed = 0;
      // Sequential: keeps load gentle and matches import semantics.
      for (const q of targets) {
        // Skip anything already banked (by normalized prompt).
        if (bankedPrompts.has(q.prompt_text.trim().toLowerCase())) continue;
        try {
          await addToBank.mutateAsync({
            prompt_text: q.prompt_text,
            question_type: q.question_type,
            difficulty: q.difficulty ?? null,
            model_answer: q.model_answer ?? null,
            source_config_id: configId,
          });
          ok += 1;
        } catch {
          failed += 1;
        }
      }
      if (failed === 0) {
        toast.success(
          t("teacher_interview_config.qbank.bulk.bank_done", { count: ok }),
        );
      } else {
        toast.error(
          t("teacher_interview_config.qbank.bulk.partial", { ok, failed }),
        );
      }
      clearSelection();
    } finally {
      setBulkBusy(false);
    }
  }
  async function bulkDelete() {
    const targets = selectedQuestions;
    if (targets.length === 0 || bulkBusy) return;
    if (
      !(await confirmAction({
        description: t("teacher_interview_config.qbank.bulk.delete_confirm", {
          count: targets.length,
        }),
      }))
    )
      return;
    setBulkBusy(true);
    // Animate all selected out together, then delete.
    setDeletingIds((prev) => {
      const next = new Set(prev);
      for (const q of targets) next.add(q.id);
      return next;
    });
    await new Promise((resolve) => setTimeout(resolve, 280));
    try {
      const results = await Promise.allSettled(
        targets.map((q) => deleteQuestion.mutateAsync(q.id)),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      const ok = results.length - failed;
      if (failed === 0) {
        toast.success(
          t("teacher_interview_config.qbank.bulk.delete_done", { count: ok }),
        );
      } else {
        toast.error(
          t("teacher_interview_config.qbank.bulk.partial", { ok, failed }),
        );
        // The query refetch reconciles reality — any rows that failed to
        // delete reappear on the next invalidation.
      }
      clearSelection();
    } finally {
      setBulkBusy(false);
    }
  }

  return {
    bulkBusy,
    bulkSetStatus,
    bulkSetOutcome,
    bulkAddToBank,
    bulkDelete,
  };
}
