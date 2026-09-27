/**
 * The interview header's back affordance must NOT be a hardcoded <Link> to
 * /courses/$slug/learn.
 *
 * Two regressions this pins:
 *  1. Silent session drop: a <Link> performs an unblocked router navigation —
 *     mid-interview the leave blocker never fires its Leave/Stay dialog, so
 *     one click quietly left the live session. Clicking must go through
 *     router.history.back(), which IS a blocked navigation the resolver can
 *     intercept.
 *  2. Wrong target via the curriculum item route: the interview proxy renders
 *     at /courses/$slug/learn/$itemSlug, so a Link to /learn yanked the
 *     candidate to the bare learn index, losing their place. history.back()
 *     returns to the real previous page.
 * A deep link with no history (canGoBack() false) falls back to the learn
 * route so the button is never dead.
 */
import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const back = vi.fn();
const canGoBack = vi.fn(() => true);
const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({
    history: { back, canGoBack },
    navigate,
  }),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

import { InterviewHeaderBrand } from "@/components/interview/stages/InterviewHeaderBrand";

function renderBrand() {
  return render(
    <InterviewHeaderBrand
      slug="course-slug"
      courseName="Course"
      interviewTitle="Interview"
    />,
  );
}

describe("InterviewHeaderBrand back button", () => {
  beforeEach(() => {
    back.mockClear();
    canGoBack.mockClear();
    canGoBack.mockReturnValue(true);
    navigate.mockClear();
  });

  it("goes through router history so a live session's leave blocker can ask", async () => {
    const user = userEvent.setup();
    const { container } = renderBrand();
    await user.click(
      within(container)
        .getAllByRole("button", { name: /quay lại khoá học|back to course/i })
        .pop()!,
    );
    expect(back).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("falls back to the learn route on a deep link with no history", async () => {
    canGoBack.mockReturnValue(false);
    const user = userEvent.setup();
    const { container } = renderBrand();
    await user.click(
      within(container)
        .getAllByRole("button", { name: /quay lại khoá học|back to course/i })
        .pop()!,
    );
    expect(back).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith({
      to: "/courses/$slug/learn",
      params: { slug: "course-slug" },
    });
  });
});
