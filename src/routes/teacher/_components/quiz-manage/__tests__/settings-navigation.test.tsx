import { createMemoryHistory, createRootRoute, createRoute, createRouter, Link, RouterProvider } from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuizNavigationGuard } from "@/routes/teacher/quiz/_components/quiz-manage/QuizNavigationGuard";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
beforeEach(() => { vi.spyOn(window, "scrollTo").mockImplementation(() => {}); });
/**
 * `Link` is typed against the APP's registered router (TanStack module
 * augmentation), even inside this test's own memory router, so `/login` still
 * demands its `search` shape. Passing it explicitly keeps the test honest
 * about the real route contract instead of casting the type away.
 */
function mount(dirty: boolean) {
  const root = createRootRoute();
  const quiz = createRoute({ getParentRoute: () => root, path: "/", component: () => <><QuizNavigationGuard dirty={dirty} /><Link to="/login" search={{ next: undefined }}>Leave quiz</Link></> });
  const destination = createRoute({ getParentRoute: () => root, path: "/login", component: () => <p>Destination</p> });
  const router = createRouter({ routeTree: root.addChildren([quiz, destination]), history: createMemoryHistory({ initialEntries: ["/"] }) });
  render(<RouterProvider router={router} />);
}
describe("quiz route navigation", () => {
  it("asks before leaving a dirty quiz; cancel stays and confirm leaves", async () => {
    const user = userEvent.setup(); mount(true);
    await user.click(await screen.findByRole("link", { name: "Leave quiz" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "common.cancel" }));
    expect(screen.getByRole("link", { name: "Leave quiz" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Leave quiz" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "common.unsaved.quit" }));
    expect(await screen.findByText("Destination")).toBeInTheDocument();
  });
  it("leaves a clean quiz without asking", async () => {
    const user = userEvent.setup(); mount(false);
    await user.click(await screen.findByRole("link", { name: "Leave quiz" }));
    expect(await screen.findByText("Destination")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
