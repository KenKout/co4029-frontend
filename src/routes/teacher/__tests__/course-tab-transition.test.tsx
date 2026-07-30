import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen } from "@testing-library/react";

import { PageHeader } from "@/components/ui/page-header";

/**
 * Two related course-tab behaviours.
 *
 * 1. The Question bank tab had its own back arrow on top of the one the course
 *    shell already renders — two stacked back controls doing the same thing.
 *    Asserted through PageHeader's contract (no `backTo`/`onBack` -> no arrow)
 *    plus a source check that the call site stopped passing it.
 *
 * 2. Every course tab should share the fade-in entrance. The tabs are separate
 *    ROUTES rendered through `<Outlet />`, not `hidden` tabpanels, so the
 *    `[role="tabpanel"][data-active="true"] > *` rule in app.css never reached
 *    them — the animation had to move to the Outlet wrapper in the shell.
 *
 * The shell itself pulls in the router and several API hooks, so the wiring that
 * cannot be expressed as a pure render is asserted against the source. Coarse,
 * but it fails loudly if someone drops the key or reinstates the arrow.
 */

const SRC = resolve(__dirname, "../../..");

function read(relativePath: string): string {
  return readFileSync(resolve(SRC, relativePath), "utf8");
}

describe("PageHeader back control", () => {
  it("renders no back arrow when neither backTo nor onBack is given", () => {
    render(<PageHeader title="Question bank" subtitle="Reusable questions" />);
    expect(screen.queryByLabelText(/back/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Question bank",
    );
  });

  it("still renders one when a caller does want it", () => {
    // The prop is shared by many pages — removing it from question-bank must not
    // have removed the capability.
    render(<PageHeader title="Elsewhere" onBack={() => {}} backLabel="Back" />);
    expect(screen.getByLabelText("Back")).toBeInTheDocument();
  });
});

describe("course question-bank tab", () => {
  it("no longer asks PageHeader for a back arrow", () => {
    // The course shell already renders one next to the breadcrumb; a second was
    // redundant.
    const source = read("routes/teacher/courses/course-question-bank.tsx");
    expect(source).not.toMatch(/backTo=/);
    expect(source).not.toMatch(/backLabel=/);
    expect(source).not.toMatch(/back_to_course/);
  });
});

describe("course shell tab transition", () => {
  const source = read("routes/teacher/courses/course-shell.tsx");

  it("animates the Outlet so every tab shares the entrance", () => {
    expect(source).toMatch(/animate-\[fade-in-up_0\.35s/);
  });

  it("keys the wrapper on the active segment so the animation re-runs", () => {
    // Without a changing key React reuses the node and the animation plays only
    // on first mount — the tab switch would look static again.
    expect(source).toMatch(/key=\{activeSegment\}/);
  });

  it("does not retain the transform after the animation", () => {
    // A `both`/`forwards` fill leaves a transform on the wrapper, and a
    // transformed ancestor becomes the containing block for sticky/fixed
    // descendants — that would break `lg:sticky lg:top-24` in the Students tab.
    const outletAnimation =
      source.match(/animate-\[fade-in-up_[^\]]+\]/g) ?? [];
    expect(outletAnimation.length).toBeGreaterThan(0);
    for (const cls of outletAnimation) {
      expect(cls).not.toMatch(/_both\]$/);
      expect(cls).not.toMatch(/_forwards\]$/);
    }
  });

  it("keeps the students tab sticky sidebar, which the freeze could have broken", () => {
    // Guards the reason for `backwards` above: if this sticky ever disappears the
    // constraint is gone, and if the animation changes to `both` it silently dies.
    expect(read("routes/teacher/courses/course-students.tsx")).toMatch(
      /lg:sticky/,
    );
  });
});
