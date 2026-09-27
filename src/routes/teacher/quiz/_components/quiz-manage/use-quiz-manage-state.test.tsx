import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { QuizManageDataController } from "./use-quiz-manage-data";
import { useQuizManageState } from "./use-quiz-manage-state";

const quiz = {
  id: "quiz-1",
} as NonNullable<QuizManageDataController["quiz"]>;

function renderState() {
  return renderHook(() =>
    useQuizManageState({
      quizId: quiz.id,
      quiz,
      questions: [],
    }),
  );
}

describe("useQuizManageState settings baseline", () => {
  it("settles when the data source returns an equivalent quiz object each render", () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount += 1;
      return useQuizManageState({
        quizId: quiz.id,
        quiz: { ...quiz },
        questions: [],
      });
    });

    expect(result.current.draft).not.toBeNull();
    expect(renderCount).toBeLessThan(5);
  });

  it("does not ask to discard immediately after settings save", () => {
    const { result } = renderState();
    const submitted = { ...result.current.draft!, title: "Saved title" };
    const saved = { ...submitted };

    act(() => {
      result.current.setDraft(submitted);
    });
    expect(result.current.settingsDirty).toBe(true);

    act(() => {
      result.current.markSettingsSaved(submitted, saved);
    });
    expect(result.current.settingsDirty).toBe(false);

    act(() => {
      result.current.selectTab("questions");
    });
    expect(result.current.tab).toBe("questions");
    expect(result.current.leaveGuard.isAsking).toBe(false);
  });
});
