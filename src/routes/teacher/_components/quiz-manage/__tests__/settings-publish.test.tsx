import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuizManagePage from "@/routes/teacher/quiz/quiz-manage";
import type { QuizManageStateController } from "@/routes/teacher/quiz/_components/quiz-manage/use-quiz-manage-state";
import { quizFixture } from "./settings-fixture";

const mocks = vi.hoisted(() => ({
  publish: vi.fn(),
  archive: vi.fn(),
  approved: true,
  quizStatus: "draft",
  publishedAt: null as string | null,
  courseStatus: "draft",
  moduleStatus: "draft",
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ courseId: "course-1", quizId: "quiz-1" }),
  useSearch: () => ({}),
}));
vi.mock(
  "@/routes/teacher/quiz/_components/quiz-manage/QuizNavigationGuard",
  () => ({ QuizNavigationGuard: () => null }),
);
vi.mock(
  "@/routes/teacher/quiz/_components/quiz-manage/QuizManageHeader",
  () => ({ QuizManageHeader: () => null }),
);
vi.mock(
  "@/routes/teacher/quiz/_components/quiz-manage/use-sticky-actions",
  () => ({
    useStickyActions: () => ({ actionsStuck: false, stickySentinelRef: null }),
  }),
);
vi.mock(
  "@/routes/teacher/quiz/_components/quiz-manage/use-quiz-manage-data",
  () => ({
    useQuizManageData: () => ({
      course: { status: mocks.courseStatus },
      courseLoading: false,
      quiz: {
        ...quizFixture,
        status: mocks.quizStatus,
        published_at: mocks.publishedAt,
      },
      questions: [
        { id: "q-1", review_status: mocks.approved ? "approved" : "pending" },
      ],
      courseModule: { id: "module-1", status: mocks.moduleStatus },
      publishQuiz: { isPending: false, mutateAsync: mocks.publish },
      archiveQuiz: { isPending: false, mutateAsync: mocks.archive },
      patchQuiz: { isPending: false },
      deleteQuiz: { isPending: false },
      pendingDeletes: { comboCount: 0 },
    }),
  }),
);
vi.mock(
  "@/routes/teacher/quiz/_components/quiz-manage/QuizManageTabPanels",
  () => ({
    QuizManageTabPanels: ({ state }: { state: QuizManageStateController }) => (
      <>
        <button onClick={() => state.setFeedbackDirty(true)}>
          Edit feedback
        </button>
        <button onClick={() => state.setOverrideDirty(true)}>
          Edit exception
        </button>
        <button onClick={() => state.setDirtyQuestionCount(1)}>
          Edit question
        </button>
        <button
          onClick={() =>
            state.setDraft((draft) => ({ ...draft!, title: "Edited" }))
          }
        >
          Edit settings
        </button>
        <button onClick={() => state.setFeedbackDirty(false)}>
          Reset feedback
        </button>
      </>
    ),
  }),
);
beforeEach(() => {
  mocks.publish.mockReset().mockResolvedValue({});
  mocks.archive.mockReset().mockResolvedValue({});
  mocks.approved = true;
  mocks.quizStatus = "draft";
  mocks.publishedAt = null;
  mocks.courseStatus = "draft";
  mocks.moduleStatus = "draft";
});

describe("quiz publish safety", () => {
  it("archives a published quiz only after confirmation", async () => {
    mocks.quizStatus = "published";
    mocks.publishedAt = "2026-09-19T00:00:00Z";
    mocks.courseStatus = "published";
    mocks.moduleStatus = "published";
    const user = userEvent.setup();
    render(<QuizManagePage />);

    await user.click(
      screen.getByRole("button", {
        name: "teacher_quiz_manage.actions.archive",
      }),
    );
    const dialog = screen.getByRole("alertdialog");
    expect(mocks.archive).not.toHaveBeenCalled();
    await user.click(
      within(dialog).getByRole("button", {
        name: "teacher_quiz_manage.actions.archive",
      }),
    );
    expect(mocks.archive).toHaveBeenCalledTimes(1);
  });

  it.each(["feedback", "exception", "question", "settings"])(
    "blocks publish while %s has unsaved work",
    async (source) => {
      const user = userEvent.setup();
      render(<QuizManagePage />);
      const publish = screen.getByRole("button", {
        name: "teacher_quiz_manage.actions.publish",
      });
      expect(publish).toBeEnabled();
      await user.click(screen.getByRole("button", { name: `Edit ${source}` }));
      expect(publish).toBeDisabled();
      expect(screen.getByRole("status")).toHaveAccessibleName(
        "teacher_quiz_manage.settings.assist.save_before_publish",
      );
      expect(mocks.publish).not.toHaveBeenCalled();
    },
  );
  it("requires approval and a separate confirmation of saved settings", async () => {
    const user = userEvent.setup();
    mocks.approved = false;
    const { rerender } = render(<QuizManagePage />);
    expect(
      screen.getByRole("button", {
        name: "teacher_quiz_manage.actions.publish",
      }),
    ).toBeDisabled();
    mocks.approved = true;
    rerender(<QuizManagePage />);
    await user.click(
      screen.getByRole("button", {
        name: "teacher_quiz_manage.actions.publish",
      }),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByText(
        "teacher_quiz_manage.settings.assist.saved_summary",
      ),
    ).toBeInTheDocument();
    expect(mocks.publish).not.toHaveBeenCalled();
    await user.click(
      within(dialog).getByRole("button", {
        name: "teacher_quiz_manage.actions.publish",
      }),
    );
    expect(mocks.publish).toHaveBeenCalledOnce();
  });

  it("permanently hides delete once the quiz has been published", () => {
    const view = render(<QuizManagePage />);
    expect(screen.getByRole("button", { name: "common.delete" })).toBeVisible();

    mocks.quizStatus = "published";
    mocks.publishedAt = "2026-09-18T00:00:00Z";
    mocks.courseStatus = "published";
    mocks.moduleStatus = "draft";
    view.rerender(<QuizManagePage />);
    expect(screen.queryByRole("button", { name: "common.delete" })).toBeNull();

    mocks.moduleStatus = "published";
    view.rerender(<QuizManagePage />);
    expect(screen.queryByRole("button", { name: "common.delete" })).toBeNull();

    mocks.quizStatus = "archived";
    view.rerender(<QuizManagePage />);
    expect(screen.queryByRole("button", { name: "common.delete" })).toBeNull();
  });
});
