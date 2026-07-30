import { describe, expect, it } from "vitest";

import {
  QUIZ_PAGE_SIZES,
  loadPageSize,
  savePageSize,
  loadFocusMs,
  saveFocusMs,
  clearSeenAt,
  saveSeenAt,
  loadSeenAt,
  type QuizPageSize,
} from "@/lib/quiz-timing";

/**
 * Pagination slicing + the timing stores behind the attention model.
 *
 * The slicing maths is pure, so it's reproduced here exactly as the component
 * computes it (importing course-quiz.tsx would pull in the router, query
 * client, i18n and every quiz API hook).
 */

function slice(total: number, pageSize: QuizPageSize, pageIndex: number) {
  const perPage = pageSize === "all" ? Math.max(1, total) : pageSize;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pageStart = safePageIndex * perPage;
  const pageEnd = Math.min(pageStart + perPage, total);
  return { perPage, pageCount, safePageIndex, pageStart, pageEnd };
}

describe("question pagination slicing", () => {
  it("offers exactly 1 / 5 / 10 / All", () => {
    expect(QUIZ_PAGE_SIZES).toEqual([1, 5, 10, "all"]);
  });

  it("size 1 reproduces the classic one-question-per-screen flow", () => {
    const s = slice(12, 1, 4);
    expect(s.pageCount).toBe(12);
    expect(s.pageStart).toBe(4);
    expect(s.pageEnd).toBe(5); // exactly one question
  });

  it('"all" collapses to a single page containing every question', () => {
    const s = slice(23, "all", 0);
    expect(s.pageCount).toBe(1);
    expect(s.pageStart).toBe(0);
    expect(s.pageEnd).toBe(23);
  });

  it("handles a ragged final page", () => {
    // 12 questions, 5 per page -> 5 / 5 / 2
    expect(slice(12, 5, 0)).toMatchObject({ pageStart: 0, pageEnd: 5 });
    expect(slice(12, 5, 1)).toMatchObject({ pageStart: 5, pageEnd: 10 });
    const last = slice(12, 5, 2);
    expect(last).toMatchObject({ pageStart: 10, pageEnd: 12 });
    expect(last.pageCount).toBe(3);
  });

  it("clamps an out-of-range page index instead of rendering nothing", () => {
    // Was on page 9 at size 1, then switched to size 10.
    const s = slice(12, 10, 9);
    expect(s.safePageIndex).toBe(1);
    expect(s.pageStart).toBe(10);
    expect(s.pageEnd).toBe(12);
  });

  it("never produces an empty slice for a non-empty quiz", () => {
    for (const size of QUIZ_PAGE_SIZES) {
      for (const total of [1, 2, 7, 10, 11, 50]) {
        for (let p = 0; p < 12; p += 1) {
          const s = slice(total, size, p);
          expect(s.pageEnd).toBeGreaterThan(s.pageStart);
          expect(s.pageEnd).toBeLessThanOrEqual(total);
        }
      }
    }
  });

  it("maps a question index onto the page that contains it", () => {
    const total = 12;
    for (const size of [1, 5, 10] as QuizPageSize[]) {
      const perPage = size as number;
      for (let idx = 0; idx < total; idx += 1) {
        const target = Math.floor(idx / perPage);
        const s = slice(total, size, target);
        expect(idx).toBeGreaterThanOrEqual(s.pageStart);
        expect(idx).toBeLessThan(s.pageEnd);
      }
    }
  });
});

describe("page-size persistence", () => {
  it("round-trips each option and defaults to 1", () => {
    window.localStorage.clear();
    expect(loadPageSize()).toBe(1);
    for (const size of QUIZ_PAGE_SIZES) {
      savePageSize(size);
      expect(loadPageSize()).toBe(size);
    }
  });

  it("falls back to 1 on a corrupted value", () => {
    window.localStorage.setItem("abridgeai.quizpagesize", "banana");
    expect(loadPageSize()).toBe(1);
  });

  it("survives finishing an attempt (it's a device preference)", () => {
    savePageSize(10);
    clearSeenAt("attempt-1");
    expect(loadPageSize()).toBe(10);
  });
});

describe("focus-time persistence", () => {
  it("round-trips accumulated per-question totals", () => {
    saveFocusMs("a1", { q1: 4500, q2: 12_000 });
    expect(loadFocusMs("a1")).toEqual({ q1: 4500, q2: 12_000 });
  });

  it("drops non-numeric / negative junk rather than trusting it", () => {
    window.localStorage.setItem(
      "abridgeai.quizfocus.a2",
      JSON.stringify({ good: 100, bad: "x", neg: -5 }),
    );
    expect(loadFocusMs("a2")).toEqual({ good: 100 });
  });

  it("is a SEPARATE store from the first-seen anchors", () => {
    // Durations and timestamps must not collide: clearing one attempt's data
    // shouldn't leave the other shape behind in a readable state.
    saveSeenAt("a3", { q1: 1_700_000_000_000 });
    saveFocusMs("a3", { q1: 8000 });
    expect(loadSeenAt("a3").q1).toBe(1_700_000_000_000);
    expect(loadFocusMs("a3").q1).toBe(8000);

    clearSeenAt("a3");
    expect(loadSeenAt("a3")).toEqual({});
    expect(loadFocusMs("a3")).toEqual({});
  });

  it("returns {} for an unknown attempt", () => {
    expect(loadFocusMs("never-seen")).toEqual({});
  });
});
