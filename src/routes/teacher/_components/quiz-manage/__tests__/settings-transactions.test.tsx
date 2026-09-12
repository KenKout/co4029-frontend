import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { server, sampleUser } from "@/test/msw-handlers";
import { FeedbackBandsPanel } from "../FeedbackBandsPanel";
import { OverridesPanel } from "../OverridesPanel";
import type { FeedbackBandRead, QuizOverrideRead } from "@/lib/api/hooks/quizzes/settings";
import { settingsFixture } from "./settings-fixture";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const baseUrl = "http://localhost:8000/api/v1";
const k = "teacher_quiz_manage.settings.assist";
const feedback = "teacher_quiz_manage.feedback_bands";
const override = "teacher_quiz_manage.overrides";
let bands: FeedbackBandRead[];
let overrides: QuizOverrideRead[];
// Typed with their call signatures: a bare `ReturnType<typeof vi.fn>` is
// `Mock<Procedure | Constructable>` under vitest 4, which tsc refuses to call
// (these are invoked from the MSW handlers below, not just asserted on).
let feedbackWrites: ReturnType<typeof vi.fn<(body: unknown) => void>>;
let overrideWrites: ReturnType<typeof vi.fn<(body: unknown) => void>>;
let deletes: ReturnType<typeof vi.fn<() => void>>;

function mount(child: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { ...render(<QueryClientProvider client={client}>{child}</QueryClientProvider>), client };
}

beforeEach(() => {
  localStorage.setItem("abridgeai.access_token", "test-access-token");
  localStorage.setItem("abridgeai.refresh_token", "test-refresh-token");
  localStorage.setItem("abridgeai.access_token_expires_at", String(Date.now() + 3600000));
  localStorage.setItem("abridgeai.user", JSON.stringify(sampleUser));
  bands = []; overrides = [];
  feedbackWrites = vi.fn<(body: unknown) => void>();
  overrideWrites = vi.fn<(body: unknown) => void>();
  deletes = vi.fn<() => void>();
  server.use(
    http.get(`${baseUrl}/teacher/quizzes/quiz-1/feedback-bands`, () => HttpResponse.json(bands)),
    http.put(`${baseUrl}/teacher/quizzes/quiz-1/feedback-bands`, async ({ request }) => {
      const body = await request.json() as { bands: FeedbackBandRead[] };
      feedbackWrites(body);
      bands = body.bands.map((band, i) => ({ ...band, id: String(i), quiz_id: "quiz-1" }));
      return HttpResponse.json(bands);
    }),
    http.get(`${baseUrl}/teacher/courses/course-1/roster`, () => HttpResponse.json({ course_id: "course-1", students: [
      { student_id: "student-1", display_name: "An Nguyen", primary_email: "an@example.com", enrollment_status: "active" },
      { student_id: "student-2", display_name: "Binh Tran", primary_email: "binh@example.com", enrollment_status: "dropped" },
    ] })),
    http.get(`${baseUrl}/teacher/quizzes/quiz-1/overrides`, () => HttpResponse.json(overrides)),
    http.post(`${baseUrl}/teacher/quizzes/quiz-1/overrides`, async ({ request }) => {
      const body = await request.json() as QuizOverrideRead;
      overrideWrites(body);
      const saved = { ...body, id: "override-1", quiz_id: "quiz-1" };
      overrides = [saved];
      return HttpResponse.json(saved);
    }),
    http.delete(`${baseUrl}/teacher/quizzes/quiz-1/overrides/override-1`, () => {
      deletes(); overrides = []; return new HttpResponse(null, { status: 204 });
    }),
  );
});

describe("separately saved quiz settings", () => {
  it("tracks feedback edits, cancels without writing, and clears dirty after confirmed save", async () => {
    const user = userEvent.setup();
    const onDirty = vi.fn();
    mount(<FeedbackBandsPanel quizId="quiz-1" onDirtyChange={onDirty} />);
    await user.click(await screen.findByRole("button", { name: `${feedback}.add` }));
    expect(onDirty).toHaveBeenLastCalledWith(true);
    await user.click(screen.getByRole("button", { name: `${feedback}.save` }));
    const dialog = await screen.findByRole("alertdialog");
    expect(feedbackWrites).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "common.cancel" }));
    expect(feedbackWrites).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: `${feedback}.save` }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: `${feedback}.save` }));
    await waitFor(() => expect(feedbackWrites).toHaveBeenCalledOnce());
    await waitFor(() => expect(onDirty).toHaveBeenLastCalledWith(false));
    expect(screen.getByRole("button", { name: `${feedback}.save` })).toBeDisabled();
  });
  it("retains unsaved feedback during a background refetch", async () => {
    const user = userEvent.setup();
    const onDirty = vi.fn();
    const { client } = mount(<FeedbackBandsPanel quizId="quiz-1" onDirtyChange={onDirty} />);
    await user.click(await screen.findByRole("button", { name: `${feedback}.add` }));
    const input = screen.getByRole("spinbutton", { name: `${feedback}.min` });
    await user.clear(input); await user.type(input, "20");
    bands = [{ id: "server-band", quiz_id: "quiz-1", min_grade: 10, max_grade: 100, feedback_text: "Server change" }];
    await client.invalidateQueries();
    expect(screen.getByRole("spinbutton", { name: `${feedback}.min` })).toHaveValue(20);
    expect(onDirty).toHaveBeenLastCalledWith(true);
  });
  it("selects a course student by name and confirms add/delete without exposing UUIDs", async () => {
    const user = userEvent.setup();
    mount(<OverridesPanel quizId="quiz-1" courseId="course-1" base={settingsFixture()} />);
    await user.click(await screen.findByRole("combobox", { name: `${k}.student` }));
    expect(screen.queryByRole("option", { name: /Binh/ })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("option", { name: /An Nguyen/ }));
    await user.type(screen.getByRole("spinbutton", { name: `${override}.time_limit_label` }), "45");
    await user.click(screen.getByRole("button", { name: `${override}.add_action` }));
    expect(overrideWrites).not.toHaveBeenCalled();
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: `${override}.add_action` }));
    await waitFor(() => expect(overrideWrites).toHaveBeenCalledWith(expect.objectContaining({ user_id: "student-1", time_limit_seconds: 2700, max_attempts: null, allow_retakes: null })));
    await user.click(await screen.findByRole("button", { name: `${override}.delete_action` }));
    expect(deletes).not.toHaveBeenCalled();
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "common.cancel" }));
    expect(deletes).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: `${override}.delete_action` }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "common.delete" }));
    await waitFor(() => expect(deletes).toHaveBeenCalledOnce());
    expect(screen.queryByText("student-1")).not.toBeInTheDocument();
  });
  it("keeps published feedback and exceptions read-only", async () => {
    mount(<><FeedbackBandsPanel quizId="quiz-1" locked /><OverridesPanel quizId="quiz-1" courseId="course-1" base={settingsFixture()} locked /></>);
    expect(await screen.findByRole("button", { name: `${feedback}.add` })).toBeDisabled();
    expect(await screen.findByRole("combobox", { name: `${k}.student` })).toBeDisabled();
    expect(screen.getByRole("button", { name: `${override}.add_action` })).toBeDisabled();
  });
  it("shows retry instead of a writable empty section after a load failure", async () => {
    server.use(http.get(`${baseUrl}/teacher/quizzes/quiz-1/feedback-bands`, () => new HttpResponse(null, { status: 500 })));
    mount(<FeedbackBandsPanel quizId="quiz-1" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(`${k}.load_failed`);
    expect(screen.queryByRole("button", { name: `${feedback}.add` })).not.toBeInTheDocument();
  });
});
