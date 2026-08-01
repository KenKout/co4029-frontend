import { useState } from "react";
import { toast } from "sonner";

import type { InterviewQuestionAuthoring } from "@/lib/api/types";
import type { ConfirmFn, TranslateFn, UpdateQuestionMutation } from "./types";
import type { useDuplicateGuard } from "./use-duplicate-guard";

/**
 * Inline edit draft for one question, extracted from the former 2.4k-line
 * question-bank.tsx. Owns the draft text, the dirty flag, and the save path
 * (duplicate check → PATCH).
 */
export interface EditDraftOptions {
  updateQuestion: UpdateQuestionMutation;
  duplicateGuard: ReturnType<typeof useDuplicateGuard>;
  confirmAction: ConfirmFn;
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSavingId: React.Dispatch<React.SetStateAction<string | null>>;
  t: TranslateFn;
}

export function useQuestionEditDraft(options: EditDraftOptions) {
  const { updateQuestion, duplicateGuard, confirmAction, setSavingId, t } =
    options;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingAnswer, setEditingAnswer] = useState("");
  const [editDirty, setEditDirty] = useState(false);

  function beginEdit(q: InterviewQuestionAuthoring) {
    setEditingId(q.id);
    setEditingText(q.prompt_text);
    setEditingAnswer(q.model_answer ?? "");
    setEditDirty(false);
    options.setExpanded((prev) => new Set(prev).add(q.id));
  }
  async function cancelEdit() {
    if (
      editDirty &&
      !(await confirmAction({
        description: t("teacher_interview_config.qbank.unsaved_confirm"),
      }))
    )
      return;
    setEditingId(null);
    setEditingText("");
    setEditingAnswer("");
    setEditDirty(false);
  }
  function changeEditingText(v: string) {
    setEditingText(v);
    setEditDirty(true);
  }
  function changeEditingAnswer(v: string) {
    setEditingAnswer(v);
    setEditDirty(true);
  }

  async function commitEdit(
    questionId: string,
    promptText: string,
    modelAnswer: string | null,
  ) {
    setSavingId(questionId);
    try {
      await updateQuestion.mutateAsync({
        questionId,
        patch: { prompt_text: promptText, model_answer: modelAnswer },
      });
      setEditingId(null);
      setEditingText("");
      setEditingAnswer("");
      setEditDirty(false);
      toast.success(t("teacher_interview_config.toasts.question_saved"));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function saveEdit() {
    if (!editingId || !editingText.trim()) return;
    // Snapshot the draft: the confirm dialog can resume this save later, by
    // which point the editor state may have been cleared or moved on.
    const questionId = editingId;
    const promptText = editingText.trim();
    const modelAnswer = editingAnswer.trim() || null;
    setSavingId(questionId);
    // Exclude self, or editing a question without touching its wording would
    // always report the question as a duplicate of itself.
    const verdict = await duplicateGuard.runDuplicateCheck(
      promptText,
      questionId,
    );
    setSavingId(null);
    if (verdict) {
      duplicateGuard.interrupt(
        verdict,
        () => void commitEdit(questionId, promptText, modelAnswer),
      );
      return;
    }
    await commitEdit(questionId, promptText, modelAnswer);
  }

  return {
    editingId,
    editingText,
    editingAnswer,
    beginEdit,
    cancelEdit,
    changeEditingText,
    changeEditingAnswer,
    saveEdit,
  };
}
