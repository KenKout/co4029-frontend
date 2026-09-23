import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { InterviewQuestionAuthoring } from "@/lib/api/types";
import { toast } from "sonner";

import {
  useQuestionMutations,
  type QuestionMutationsOptions,
} from "../use-question-mutations";

/**
 * Inline difficulty control (question-bank DifficultyControl → mutations).
 *
 * Difficulty is the one generated property a teacher may want to re-judge per
 * question: the generator labels a question mid_level, but the cohort sitting
 * the interview may be juniors. The control follows the outcome control's
 * contract exactly — pick a level, PATCH it immediately, offer Undo — and must
 * be a no-op when the chosen level equals the current one.
 */

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function question(difficulty: string | null): InterviewQuestionAuthoring {
  return {
    id: "q-1",
    prompt_text: "Explain a database index",
    question_type: "technical",
    review_status: "approved",
    difficulty,
  } as unknown as InterviewQuestionAuthoring;
}

function setup() {
  const updateQuestion = {
    mutateAsync: vi.fn().mockResolvedValue(undefined),
  };
  const options = {
    updateQuestion,
    approveQuestionVariants: { mutateAsync: vi.fn() },
    deleteQuestion: { mutateAsync: vi.fn() },
    deleteQuestionVariants: { mutateAsync: vi.fn() },
    pendingQuestions: [],
    outcomeById: new Map(),
    announce: vi.fn(),
    confirmAction: vi.fn().mockResolvedValue(true),
    t: ((key: string) => key) as unknown as QuestionMutationsOptions["t"],
  } as unknown as QuestionMutationsOptions;
  const hook = renderHook(() => useQuestionMutations(options));
  return { ...hook, updateQuestion };
}

describe("setDifficulty", () => {
  beforeEach(() => {
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it("PATCHes the chosen difficulty immediately and offers undo", async () => {
    const { result, updateQuestion } = setup();
    await act(async () => {
      await result.current.setDifficulty(question("mid_level"), "senior");
    });
    expect(updateQuestion.mutateAsync).toHaveBeenCalledWith({
      questionId: "q-1",
      patch: { difficulty: "senior" },
    });
    // Undo rides the toast, same contract as the outcome control.
    expect(toast.success).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        action: expect.objectContaining({ label: expect.any(String) }),
      }),
    );
  });

  it("does not PATCH when the chosen level equals the current one", async () => {
    const { result, updateQuestion } = setup();
    await act(async () => {
      await result.current.setDifficulty(question("senior"), "senior");
    });
    expect(updateQuestion.mutateAsync).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("treats a question without difficulty as null, so any pick saves", async () => {
    const { result, updateQuestion } = setup();
    await act(async () => {
      await result.current.setDifficulty(question(null), "junior");
    });
    expect(updateQuestion.mutateAsync).toHaveBeenCalledWith({
      questionId: "q-1",
      patch: { difficulty: "junior" },
    });
  });
});
