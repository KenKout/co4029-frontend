import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { InterviewQuestionAuthoring } from "@/lib/api/types";
import {
  useQuestionEditDraft,
  type EditDraftOptions,
} from "../use-question-edit-draft";

/**
 * Edit-draft dirty gating (question-bank edit form).
 *
 * Opening the editor seeds the draft from the saved question, so "Edit" alone
 * is NOT a change. Save stays disabled until the teacher actually edits
 * something — the dirty flag is what gates the button, and cancelling without
 * changes must not prompt for confirmation.
 */

const QUESTION = {
  id: "q-1",
  prompt_text: "Explain a database index",
  model_answer: "A B-tree structure that…",
} as unknown as InterviewQuestionAuthoring;

function fakeOptions(
  overrides: Partial<EditDraftOptions> = {},
): EditDraftOptions {
  return {
    updateQuestion: {
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    } as unknown as EditDraftOptions["updateQuestion"],
    duplicateGuard: {
      runDuplicateCheck: vi.fn().mockResolvedValue(null),
      interrupt: vi.fn(),
      duplicateWarning: null,
      dismiss: vi.fn(),
      confirm: vi.fn(),
    },
    confirmAction: vi.fn().mockResolvedValue(true),
    setExpanded: vi.fn(),
    setSavingId: vi.fn(),
    t: ((key: string) => key) as never,
    ...overrides,
  };
}

function setup() {
  const confirmAction = vi.fn().mockResolvedValue(true);
  const options = fakeOptions({ confirmAction });
  const hook = renderHook(() => useQuestionEditDraft(options));
  return { ...hook, confirmAction };
}

describe("useQuestionEditDraft dirty gating", () => {
  it("starts clean after beginEdit — opening the editor is not a change", () => {
    const { result } = setup();
    act(() => result.current.beginEdit(QUESTION));
    expect(result.current.editDirty).toBe(false);
  });

  it("turns dirty on the first edit and stays dirty", () => {
    const { result } = setup();
    act(() => result.current.beginEdit(QUESTION));
    act(() => result.current.changeEditingText("Explain a B-tree index"));
    expect(result.current.editDirty).toBe(true);
    act(() => result.current.changeEditingText(QUESTION.prompt_text));
    // Reverting the text by hand is still an edit the teacher made.
    expect(result.current.editDirty).toBe(true);
  });

  it("cancels without a confirm prompt when nothing was changed", async () => {
    const { result, confirmAction } = setup();
    act(() => result.current.beginEdit(QUESTION));
    await act(async () => {
      await result.current.cancelEdit();
    });
    expect(confirmAction).not.toHaveBeenCalled();
    expect(result.current.editingId).toBeNull();
    expect(result.current.editDirty).toBe(false);
  });
});
