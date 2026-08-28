import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useQuestionDraft } from "@/routes/teacher/_components/quiz-manage/use-question-draft";
import type { QuizQuestionAuthoring } from "@/lib/api/types";

/**
 * Regression guard for PRD O-07 / FR-033.
 *
 * Opening a quiz whose AI-generated questions carry no saved
 * `expected_response_time_ms` used to mark every one of them dirty, because
 * the editor pre-fills a default and dirtiness was measured against the raw
 * row. The teacher saw "31 unsaved" and hit a leave-guard on tab switch
 * without having touched anything.
 *
 * The fix splits the two meanings apart, and BOTH must hold:
 *
 *   isUnsaved     — editor differs from the stored ROW. Still true for a
 *                   pre-filled default; drives the amber banner + its bulk
 *                   Save, and keeps the navigator from calling it an error.
 *   hasUserEdits  — the teacher actually changed something. The ONLY thing
 *                   allowed to arm the leave-guard.
 *
 * Testing through the hook rather than a pure helper is deliberate: the two
 * baselines live in its useMemos, and that pairing is the thing that broke.
 *
 * NOTE: the question object must be built OUTSIDE the render callback. The
 * hook resyncs its draft whenever `question` changes identity, so a fresh
 * object per render loops forever.
 */
function makeQuestion(
  overrides: Partial<QuizQuestionAuthoring> = {},
): QuizQuestionAuthoring {
  return {
    id: "q1",
    quiz_id: "quiz1",
    prompt: "What is 2 + 2?",
    question_type: "single_choice",
    options: [
      { id: "a", text: "3", is_correct: false },
      { id: "b", text: "4", is_correct: true },
    ],
    explanation: null,
    difficulty: "medium",
    expected_response_time_ms: null,
    review_status: "pending",
    ...overrides,
  } as unknown as QuizQuestionAuthoring;
}

describe("useQuestionDraft — unsaved vs edited", () => {
  it("a pre-filled default is unsaved but NOT a user edit", () => {
    const onDirty = vi.fn();
    const onUserEdit = vi.fn();
    // No saved expected time: buildQuestionDraft pre-fills the default.
    const question = makeQuestion();
    renderHook(() => useQuestionDraft(question, onDirty, onUserEdit));

    // Banner channel sees it (row really is null)...
    expect(onDirty).toHaveBeenCalledWith("q1", true);
    // ...but the guard channel must not, or simply opening the tab claims
    // there is work to lose.
    expect(onUserEdit).toHaveBeenCalledWith("q1", false);
  });

  it("a question with a saved time is neither unsaved nor edited", () => {
    const onDirty = vi.fn();
    const onUserEdit = vi.fn();
    const question = makeQuestion({ expected_response_time_ms: 45000 });
    renderHook(() => useQuestionDraft(question, onDirty, onUserEdit));
    expect(onDirty).toHaveBeenCalledWith("q1", false);
    expect(onUserEdit).toHaveBeenCalledWith("q1", false);
  });

  it("an actual edit arms BOTH channels", () => {
    const onDirty = vi.fn();
    const onUserEdit = vi.fn();
    const question = makeQuestion({ expected_response_time_ms: 45000 });
    const { result } = renderHook(() =>
      useQuestionDraft(question, onDirty, onUserEdit),
    );

    act(() => {
      result.current.setDraft((d) => ({ ...d, prompt: "Edited prompt" }));
    });

    expect(onDirty).toHaveBeenLastCalledWith("q1", true);
    expect(onUserEdit).toHaveBeenLastCalledWith("q1", true);
  });

  it("editing a question that had no saved time still arms the guard", () => {
    const onDirty = vi.fn();
    const onUserEdit = vi.fn();
    const question = makeQuestion();
    const { result } = renderHook(() =>
      useQuestionDraft(question, onDirty, onUserEdit),
    );

    act(() => {
      result.current.setDraft((d) => ({ ...d, prompt: "Changed" }));
    });

    // The default pre-fill must not mask a genuine later edit.
    expect(onUserEdit).toHaveBeenLastCalledWith("q1", true);
  });
});
