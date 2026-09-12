import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQuizManageState } from "@/routes/teacher/quiz/_components/quiz-manage/use-quiz-manage-state";
import { quizFixture } from "./settings-fixture";
import type { QuizAuthoring } from "@/lib/api/types";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const questions: [] = [];
function setup() {
  return renderHook(({ quiz }: { quiz: QuizAuthoring }) => useQuizManageState({ quizId: quiz.id, quiz, questions }), { initialProps: { quiz: quizFixture } });
}
describe("quiz unsaved work", () => {
  it("includes feedback and exception drafts in the page-wide publish/leave guard", () => {
    const { result } = setup();
    expect(result.current.hasUnsavedWork).toBe(false);
    act(() => result.current.setFeedbackDirty(true));
    expect(result.current.hasUnsavedWork).toBe(true);
    act(() => result.current.selectTab("preview"));
    expect(result.current.leaveGuard.isAsking).toBe(true);
    expect(result.current.tab).toBe("settings");
    act(() => { result.current.leaveGuard.cancel(); result.current.setFeedbackDirty(false); result.current.setOverrideDirty(true); });
    expect(result.current.hasUnsavedWork).toBe(true);
    act(() => result.current.setOverrideDirty(false));
    expect(result.current.hasUnsavedWork).toBe(false);
  });
  it("does not discard edits on background refetch, but refreshes a clean draft", () => {
    const { result, rerender } = setup();
    rerender({ quiz: { ...quizFixture, title: "Server title" } });
    expect(result.current.draft?.title).toBe("Server title");
    act(() => result.current.setDraft((current) => ({ ...current!, title: "My unsaved title" })));
    rerender({ quiz: { ...quizFixture, title: "Another server title" } });
    expect(result.current.draft?.title).toBe("My unsaved title");
    expect(result.current.hasUnsavedWork).toBe(true);
  });
  it("does not warn when reselecting the active tab and tracks question edits", () => {
    const { result } = setup();
    act(() => result.current.setDirtyQuestionCount(1));
    act(() => result.current.selectTab("settings"));
    expect(result.current.leaveGuard.isAsking).toBe(false);
    expect(result.current.hasUnsavedWork).toBe(true);
  });
  it("initializes the destination quiz after leaving the old draft", () => {
    const { result, rerender } = setup();
    act(() => result.current.setDraft((current) => ({ ...current!, title: "Old unsaved title" })));
    rerender({ quiz: { ...quizFixture, id: "quiz-2", title: "Destination quiz" } });
    expect(result.current.draft?.title).toBe("Destination quiz");
    expect(result.current.hasUnsavedWork).toBe(false);
  });
});
