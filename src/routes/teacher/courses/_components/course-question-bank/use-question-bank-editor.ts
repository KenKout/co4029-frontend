import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";

import type { InterviewQuestionBankItemRead } from "@/lib/api/types";
import type { EditorState, TranslateFn, UpdateBankItemMutation } from "./types";

/**
 * The inline row editor's state for the course-level Question Bank, extracted
 * from the former 843-line course-question-bank.tsx. Owns which row is open
 * (`editingId`), its draft, and the in-flight marker the row renders from
 * (`savingId`) — three `useState` calls in their original order.
 *
 * `t` and the mutation arrive as options rather than being read here, so the
 * orchestrator's hook sequence is unchanged.
 */
export interface QuestionBankEditorController {
  editingId: string | null;
  draft: EditorState | null;
  setDraft: Dispatch<SetStateAction<EditorState | null>>;
  savingId: string | null;
  beginEdit: (item: InterviewQuestionBankItemRead) => void;
  cancelEdit: () => void;
  saveEdit: () => Promise<void>;
}

export function useQuestionBankEditor(options: {
  t: TranslateFn;
  updateItem: UpdateBankItemMutation;
}): QuestionBankEditorController {
  const { t, updateItem } = options;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditorState | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  function beginEdit(item: InterviewQuestionBankItemRead) {
    setEditingId(item.id);
    setDraft({
      prompt_text: item.prompt_text,
      question_type: item.question_type,
      difficulty: item.difficulty ?? "none",
      model_answer: item.model_answer ?? "",
      tags: item.tags ?? [],
    });
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }
  async function saveEdit() {
    if (!editingId || !draft || !draft.prompt_text.trim()) return;
    setSavingId(editingId);
    try {
      await updateItem.mutateAsync({
        itemId: editingId,
        patch: {
          prompt_text: draft.prompt_text.trim(),
          question_type: draft.question_type,
          difficulty: draft.difficulty === "none" ? null : draft.difficulty,
          model_answer: draft.model_answer.trim() || null,
          tags: draft.tags,
        },
      });
      toast.success(t("teacher_question_bank.saved"));
      cancelEdit();
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  return {
    editingId,
    draft,
    setDraft,
    savingId,
    beginEdit,
    cancelEdit,
    saveEdit,
  };
}
