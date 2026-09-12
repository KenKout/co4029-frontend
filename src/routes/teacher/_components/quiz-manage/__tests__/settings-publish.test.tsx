import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuizManagePage from "@/routes/teacher/quiz/quiz-manage";
import type { QuizManageStateController } from "@/routes/teacher/quiz/_components/quiz-manage/use-quiz-manage-state";
import { quizFixture } from "./settings-fixture";

const mocks = vi.hoisted(() => ({ publish: vi.fn(), approved: true }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }) }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn(), useParams: () => ({ courseId: "course-1", quizId: "quiz-1" }), useSearch: () => ({}) }));
vi.mock("@/routes/teacher/quiz/_components/quiz-manage/QuizNavigationGuard", () => ({ QuizNavigationGuard: () => null }));
vi.mock("@/routes/teacher/quiz/_components/quiz-manage/QuizManageHeader", () => ({ QuizManageHeader: () => null }));
vi.mock("@/routes/teacher/quiz/_components/quiz-manage/use-sticky-actions", () => ({ useStickyActions: () => ({ actionsStuck: false, stickySentinelRef: null }) }));
vi.mock("@/routes/teacher/quiz/_components/quiz-manage/use-quiz-manage-data", () => ({
  useQuizManageData: () => ({
    quiz: quizFixture, questions: [{ id: "q-1", review_status: mocks.approved ? "approved" : "pending" }], courseModule: { id: "module-1" },
    publishQuiz: { isPending: false, mutateAsync: mocks.publish }, patchQuiz: { isPending: false }, deleteQuiz: { isPending: false },
    pendingDeletes: { comboCount: 0 },
  }),
}));
vi.mock("@/routes/teacher/quiz/_components/quiz-manage/QuizManageTabPanels", () => ({
  QuizManageTabPanels: ({ state }: { state: QuizManageStateController }) => <>
    <button onClick={() => state.setFeedbackDirty(true)}>Edit feedback</button>
    <button onClick={() => state.setOverrideDirty(true)}>Edit exception</button>
    <button onClick={() => state.setDirtyQuestionCount(1)}>Edit question</button>
    <button onClick={() => state.setDraft((draft) => ({ ...draft!, title: "Edited" }))}>Edit settings</button>
    <button onClick={() => state.setFeedbackDirty(false)}>Reset feedback</button>
  </>,
}));
beforeEach(() => { mocks.publish.mockReset().mockResolvedValue({}); mocks.approved = true; });

describe("quiz publish safety", () => {
  it.each(["feedback", "exception", "question", "settings"])("blocks publish while %s has unsaved work", async (source) => {
    const user = userEvent.setup();
    render(<QuizManagePage />);
    const publish = screen.getByRole("button", { name: "teacher_quiz_manage.actions.publish" });
    expect(publish).toBeEnabled();
    await user.click(screen.getByRole("button", { name: `Edit ${source}` }));
    expect(publish).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("teacher_quiz_manage.settings.assist.save_before_publish");
    expect(mocks.publish).not.toHaveBeenCalled();
  });
  it("requires approval and a separate confirmation of saved settings", async () => {
    const user = userEvent.setup();
    mocks.approved = false;
    const { rerender } = render(<QuizManagePage />);
    expect(screen.getByRole("button", { name: "teacher_quiz_manage.actions.publish" })).toBeDisabled();
    mocks.approved = true; rerender(<QuizManagePage />);
    await user.click(screen.getByRole("button", { name: "teacher_quiz_manage.actions.publish" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("teacher_quiz_manage.settings.assist.saved_summary")).toBeInTheDocument();
    expect(mocks.publish).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "teacher_quiz_manage.actions.publish" }));
    expect(mocks.publish).toHaveBeenCalledOnce();
  });
});
