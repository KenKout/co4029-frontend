import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";

import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { cn } from "@/lib/utils";

/**
 * NOTE: the shared test setup forces i18n to Vietnamese, so these assertions
 * match on the element/role rather than an English label.
 *
 * The floating "back to top" control. Shared between the course-manage page and
 * the teacher quiz-manage page, so its show/hide threshold and the caller's
 * ability to move the anchor are both worth pinning.
 */

function setScrollY(y: number) {
  Object.defineProperty(window, "scrollY", {
    value: y,
    writable: true,
    configurable: true,
  });
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

beforeEach(() => {
  setScrollY(0);
  // jsdom has no rAF throttling guarantees; run callbacks immediately so the
  // scroll handler's requestAnimationFrame resolves within the test tick.
  // Returning 0 matters: the component stores the handle in a `frame` guard and
  // skips work while it's truthy. Because this stub invokes the callback
  // synchronously (which resets the guard to 0) BEFORE the assignment happens,
  // returning a truthy handle would leave the guard permanently set and every
  // later scroll event would be dropped.
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ScrollToTop", () => {
  it("is hidden (and untabbable) near the top of the page", () => {
    render(<ScrollToTop />);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("opacity-0");
    expect(btn.className).toContain("pointer-events-none");
    expect(btn).toHaveAttribute("tabindex", "-1");
  });

  it("appears once scrolled past the threshold", () => {
    render(<ScrollToTop showAfter={400} />);
    const btn = screen.getByRole("button");

    setScrollY(401);
    expect(btn.className).toContain("opacity-100");
    expect(btn).toHaveAttribute("tabindex", "0");

    // ...and hides again on the way back up.
    setScrollY(10);
    expect(btn.className).toContain("opacity-0");
  });

  it("honours a custom showAfter threshold", () => {
    render(<ScrollToTop showAfter={100} />);
    const btn = screen.getByRole("button");
    setScrollY(150);
    expect(btn.className).toContain("opacity-100");
  });

  it("scrolls the window to the top when clicked", async () => {
    const user = userEvent.setup();
    render(<ScrollToTop />);
    setScrollY(800);
    await user.click(screen.getByRole("button"));
    expect(window.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ top: 0 }),
    );
  });

  it("lets a caller override the anchor without leaving a duplicate class", () => {
    // quiz-manage passes bottom-24 to clear the undo snackbar. tailwind-merge
    // must REPLACE the default bottom-6 rather than emit both, otherwise the
    // winner would depend on stylesheet order.
    const merged = cn("fixed bottom-6 right-6 z-30", "bottom-24");
    expect(merged).toContain("bottom-24");
    expect(merged).not.toContain("bottom-6");

    const { container } = render(<ScrollToTop className="bottom-24" />);
    const btn = container.querySelector("button")!;
    expect(btn.className).toContain("bottom-24");
    expect(btn.className).not.toContain("bottom-6");
  });
});
