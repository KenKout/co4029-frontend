import { useState } from "react";
import { toast } from "sonner";

import type {
  InterviewQuestionAuthoring,
  InterviewQuestionBankLogicalGroupCreate,
} from "@/lib/api/types";
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

const LOGICAL_ANGLES = [
  "technical",
  "system_design",
  "situational",
  "behavioral",
] as const;

type LogicalAngle = (typeof LOGICAL_ANGLES)[number];

type AddLogicalGroupToBankFn = {
  mutateAsync: (payload: InterviewQuestionBankLogicalGroupCreate) => Promise<unknown>;
};

const promptKey = (question: InterviewQuestionAuthoring) =>
  question.prompt_text.trim().toLowerCase();

/** Split a selection into logical groups (first-seen order) and standalone rows. */
function splitTargets(targets: InterviewQuestionAuthoring[]) {
  const byGroup = new Map<string, InterviewQuestionAuthoring[]>();
  const standalone: InterviewQuestionAuthoring[] = [];
  for (const question of targets) {
    if (!question.variant_group_id) {
      standalone.push(question);
      continue;
    }
    const group = byGroup.get(question.variant_group_id);
    if (group) group.push(question);
    else byGroup.set(question.variant_group_id, [question]);
  }
  return { byGroup, standalone };
}

/**
 * Add one complete four-angle group as a single atomic request, keeping the
 * shared logical group, in canonical angle order. A partial selection or an
 * already-seen prompt returns 0 — the group is never downgraded into loose
 * bank entries. `seenPrompts` is only extended on success, so a failed group
 * does not reserve its prompts against later standalone rows.
 */
async function bankLogicalGroup(
  questions: InterviewQuestionAuthoring[],
  configId: string,
  addLogicalGroupToBank: AddLogicalGroupToBankFn,
  seenPrompts: Set<string>,
): Promise<number> {
  const byAngle = new Map(
    questions.map((question) => [question.question_type, question]),
  );
  const complete =
    questions.length === LOGICAL_ANGLES.length &&
    LOGICAL_ANGLES.every((angle) => byAngle.has(angle));
  if (!complete) return 0;
  if (questions.some((question) => seenPrompts.has(promptKey(question)))) return 0;
  const toBankItem = (question: InterviewQuestionAuthoring) => ({
    prompt_text: question.prompt_text,
    question_type: question.question_type as LogicalAngle,
    difficulty: question.difficulty ?? null,
    model_answer: question.model_answer ?? null,
    source_config_id: configId,
  });
  try {
    await addLogicalGroupToBank.mutateAsync({
      items: LOGICAL_ANGLES.map((angle) =>
        toBankItem(byAngle.get(angle)!),
      ) as InterviewQuestionBankLogicalGroupCreate["items"],
    });
  } catch {
    return 0;
  }
  // Only a landed group reserves its prompts — see the doc comment above.
  for (const question of questions) seenPrompts.add(promptKey(question));
  return questions.length;
}

/** Add one standalone question. Returns true on success, false on failure. */
async function bankStandaloneQuestion(
  question: InterviewQuestionAuthoring,
  configId: string,
  addToBank: AddToBankMutation,
): Promise<boolean> {
  try {
    await addToBank.mutateAsync({
      prompt_text: question.prompt_text,
      question_type: question.question_type,
      difficulty: question.difficulty ?? null,
      model_answer: question.model_answer ?? null,
      source_config_id: configId,
    });
    return true;
  } catch {
    return false;
  }
}

export interface BulkActionsOptions {
  configId: string;
  selectedQuestions: InterviewQuestionAuthoring[];
  clearSelection: () => void;
  updateQuestion: UpdateQuestionMutation;
  deleteQuestion: DeleteQuestionMutation;
  addToBank: AddToBankMutation;
  addLogicalGroupToBank: AddLogicalGroupToBankFn;
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
    addLogicalGroupToBank,
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
      const { byGroup, standalone } = splitTargets(targets);
      let ok = 0;
      let failed = 0;
      // Every prompt already in the bank, plus every prompt this batch lands.
      // A logical group that succeeds reserves all four of its prompts so a
      // later standalone row with the same prompt is skipped, not duplicated.
      const seenPrompts = new Set(bankedPrompts);
      for (const questions of byGroup.values()) {
        const added = await bankLogicalGroup(
          questions,
          configId,
          addLogicalGroupToBank,
          seenPrompts,
        );
        ok += added;
        failed += questions.length - added;
      }
      for (const question of standalone) {
        const prompt = promptKey(question);
        if (seenPrompts.has(prompt)) continue;
        seenPrompts.add(prompt);
        if (await bankStandaloneQuestion(question, configId, addToBank)) {
          ok += 1;
        } else {
          failed += 1;
        }
      }
      if (failed === 0) {
        toast.success(t("teacher_interview_config.qbank.bulk.bank_done", { count: ok }));
      } else if (ok > 0) {
        toast.error(t("teacher_interview_config.qbank.bulk.partial", { ok, failed }));
      } else {
        toast.error(t("teacher_interview_config.qbank.bulk.failed"));
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
