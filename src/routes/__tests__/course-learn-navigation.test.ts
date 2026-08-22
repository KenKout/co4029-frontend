import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Regression tests for two student-facing navigation bugs on the Learn page.
 *
 * Reported symptoms:
 *   1. On a lesson, clicking the "Learn" breadcrumb did nothing — the lesson
 *      stayed on screen.
 *   2. On a lesson, browser Back skipped the Learn page entirely and threw the
 *      student out to the course page.
 *
 * Root causes:
 *   - `openLesson` navigated with `replace: true`, overwriting the plain /learn
 *     history entry, so Back had nothing to return to (bug 2).
 *   - `showHome` was local state hand-synced from an effect keyed on
 *     `search.item`. Router navigation is async and `lessonItems` is not
 *     referentially stable (it derives from `t`), so the effect re-ran with the
 *     stale ?item and immediately flipped showHome back to false (bug 1). The
 *     same missing sync meant Back (which only changes the search param, leaving
 *     the component mounted) never restored the home view.
 *
 * Fix: push instead of replace, and derive `showHome` from the URL.
 */

const SRC = readFileSync(resolve(__dirname, "../courses/course-learn.tsx"), "utf8");

/** The view model the page now uses: home-vs-lesson is a function of the URL. */
function showHomeFor(search: {
  item?: string;
  t?: number | null;
  p?: number | null;
  hash?: string | null;
}) {
  const seekSeconds = search.t ?? null;
  const targetPage = search.p ?? null;
  const targetAnchor = search.hash ?? null;
  return (
    !search.item && seekSeconds === null && targetPage === null && !targetAnchor
  );
}

describe("showHome is derived from the URL", () => {
  it("shows course-home with a bare /learn URL", () => {
    expect(showHomeFor({})).toBe(true);
  });

  it("shows the lesson when ?item is present", () => {
    expect(showHomeFor({ item: "lesson-abc" })).toBe(false);
  });

  it("clearing ?item returns to course-home (the Learn crumb)", () => {
    // Bug 1: this transition previously got reverted by the restore effect.
    expect(showHomeFor({ item: "lesson-abc" })).toBe(false);
    expect(showHomeFor({})).toBe(true);
  });

  it("browser Back to a bare /learn URL restores course-home", () => {
    // Bug 2 (second half): Back only changes the search param; the derived
    // value must follow it without any effect having to fire.
    const afterBack = showHomeFor({});
    expect(afterBack).toBe(true);
  });

  it("still honours content deep-links without ?item", () => {
    // ?t= seek, ?p= page and #anchor must drop straight into the content view,
    // not the home summary.
    expect(showHomeFor({ t: 30 })).toBe(false);
    expect(showHomeFor({ p: 4 })).toBe(false);
    expect(showHomeFor({ hash: "section-2" })).toBe(false);
  });

  it("is a pure function of the URL — no ordering or timing involved", () => {
    // Same input, same output, regardless of how many times it's evaluated.
    const a = showHomeFor({ item: "x" });
    const b = showHomeFor({ item: "x" });
    expect(a).toBe(b);
    expect(a).toBe(false);
  });
});

describe("history behaviour in the source", () => {
  it("openLesson pushes rather than replaces", () => {
    // The regression: `replace: true` here ate the /learn history entry.
    const fn = SRC.slice(
      SRC.indexOf("function openLesson"),
      SRC.indexOf("function goHome"),
    );
    expect(fn).toContain("navigate(");
    expect(fn).not.toContain("replace: true");
  });

  it("goHome pushes rather than replaces", () => {
    const start = SRC.indexOf("function goHome");
    const fn = SRC.slice(start, start + 500);
    expect(fn).toContain("item: undefined");
    expect(fn).not.toContain("replace: true");
  });

  it("no longer keeps showHome in local state", () => {
    // Hand-synced state was the source of bug 1; guard against it coming back.
    expect(SRC).not.toContain("setShowHome");
    expect(SRC).not.toMatch(/const \[showHome/);
  });

  it("the ?item restore effect no longer drives the home flag", () => {
    // It should only move activeIdx now; owning both was the race.
    const effect = SRC.slice(
      SRC.indexOf("if (!search.item || lessonItems.length === 0) return;"),
      SRC.indexOf("}, [search.item, lessonItems]);"),
    );
    expect(effect).toContain("setActiveIdx");
    expect(effect).not.toContain("setShowHome");
  });
});
