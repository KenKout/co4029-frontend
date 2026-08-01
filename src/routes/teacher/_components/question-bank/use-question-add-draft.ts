import { useState } from "react";
import { toast } from "sonner";

import type { CreateQuestionMutation } from "./types";
import type { useDuplicateGuard } from "./use-duplicate-guard";

/**
 * Add-manual draft, extracted from the former 2.4k-line question-bank.tsx.
 * New questions are created as `conceptual`, exactly as before.
 */
export function useQuestionAddDraft(options: {
  createQuestion: CreateQuestionMutation;
  duplicateGuard: ReturnType<typeof useDuplicateGuard>;
}) {
  const { createQuestion, duplicateGuard } = options;
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  async function commitAdd(promptText: string, modelAnswer: string | null) {
    try {
      await createQuestion.mutateAsync({
        prompt_text: promptText,
        question_type: "conceptual",
        model_answer: modelAnswer,
      });
      setAdding(false);
      setNewText("");
      setNewAnswer("");
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  }

  async function handleAdd() {
    const promptText = newText.trim();
    if (!promptText) return;
    const modelAnswer = newAnswer.trim() || null;
    // No question id to exclude: nothing exists to match against yet.
    const verdict = await duplicateGuard.runDuplicateCheck(promptText, null);
    if (verdict) {
      duplicateGuard.interrupt(
        verdict,
        () => void commitAdd(promptText, modelAnswer),
      );
      return;
    }
    await commitAdd(promptText, modelAnswer);
  }

  function cancelAdd() {
    setAdding(false);
    setNewText("");
    setNewAnswer("");
  }

  return {
    adding,
    setAdding,
    newText,
    setNewText,
    newAnswer,
    setNewAnswer,
    handleAdd,
    cancelAdd,
  };
}
