import { useState } from "react";

import { isActionableDuplicate } from "@/lib/api/hooks/interviews";
import type { InterviewQuestionDuplicateCheck } from "@/lib/api/types";
import type { CheckDuplicateMutation } from "./types";

/**
 * The advisory duplicate-prompt guard shared by the edit and add flows,
 * extracted from the former 2.4k-line question-bank.tsx.
 *
 * A pending verdict holds the save it interrupted so confirming resumes
 * exactly that write — the check is advisory, so "Save anyway" is always
 * available.
 */
export interface DuplicateWarning {
  check: InterviewQuestionDuplicateCheck;
  proceed: () => void;
}

export function useDuplicateGuard(options: {
  checkDuplicate: CheckDuplicateMutation;
}) {
  const { checkDuplicate } = options;
  const [duplicateWarning, setDuplicateWarning] =
    useState<DuplicateWarning | null>(null);

  /**
   * Ask the bank whether this prompt already exists.
   *
   * Returns a verdict only when there is something worth interrupting the save
   * for; `null` means "go ahead". The three non-duplicate outcomes — feature
   * disabled, check errored, genuinely unique — all collapse to `null` here
   * because none of them should stop or nag the teacher. A thrown request is
   * swallowed for the same reason: a check that could not run is not evidence
   * of a duplicate, and losing the save over it would be far worse than
   * missing one warning.
   */
  async function runDuplicateCheck(
    promptText: string,
    excludeQuestionId: string | null,
  ): Promise<InterviewQuestionDuplicateCheck | null> {
    try {
      const verdict = await checkDuplicate.mutateAsync({
        prompt_text: promptText,
        exclude_question_id: excludeQuestionId,
      });
      return isActionableDuplicate(verdict) ? verdict : null;
    } catch {
      return null;
    }
  }

  function interrupt(
    check: InterviewQuestionDuplicateCheck,
    proceed: () => void,
  ) {
    setDuplicateWarning({ check, proceed });
  }

  function dismiss() {
    setDuplicateWarning(null);
  }
  function confirm() {
    const pending = duplicateWarning;
    setDuplicateWarning(null);
    pending?.proceed();
  }

  return {
    duplicateWarning,
    runDuplicateCheck,
    interrupt,
    dismiss,
    confirm,
  };
}
