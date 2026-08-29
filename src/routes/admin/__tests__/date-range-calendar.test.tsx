import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import i18n from "@/i18n";
import {
  DateRangeCalendar,
  type DateRangeDraft,
} from "@/routes/admin/_components/stats/DateRangeCalendar";

/**
 * Two bugs this pins, both reported from the running app.
 *
 * 1. Paging a month pushed the grid further down the page each click. The
 *    leading/trailing blank cells were keyed with `cells.indexOf(iso)`, and
 *    `indexOf(null)` returns the FIRST null's index — so every blank in the
 *    month shared one key and React could not tell them apart across renders.
 *
 * 2. A range picked across both columns only ever showed one of its ends per
 *    column, so when both columns sat on the same month each one drew a band
 *    running off the edge with no visible endpoint.
 */

function renderCalendar(draft: DateRangeDraft) {
  const onDraftChange = vi.fn();
  const utils = render(
    <DateRangeCalendar
      draft={draft}
      onDraftChange={onDraftChange}
      onApply={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
  return { ...utils, onDraftChange };
}

/** Day buttons carry an ISO aria-label; blanks are plain spacer divs. */
function dayCells(): HTMLElement[] {
  return screen
    .getAllByRole("button")
    .filter((el) =>
      /^\d{4}-\d{2}-\d{2}/.test(el.getAttribute("aria-label") ?? ""),
    );
}

/**
 * Every child of every 7-column grid: 7 weekday headers + 42 cells per month,
 * blanks included.
 *
 * Counting only the day BUTTONS cannot detect this bug. `buildMonthGrid`
 * always returns exactly 42 entries, so the button count is constant by
 * construction — it is the blank spacer divs that were mis-reconciled, and
 * they are plain divs with no role.
 */
function gridChildCounts(container: HTMLElement): number[] {
  return Array.from(container.querySelectorAll(".grid-cols-7")).map(
    (grid) => grid.children.length,
  );
}

/**
 * Chevrons resolved through i18n, not a hard-coded English string: the suite
 * runs in Vietnamese, and a literal would pass only by accident of locale.
 */
function chevron(key: "prev_month_aria" | "next_month_aria"): HTMLElement {
  const label = i18n.t(`admin.stats.range.${key}`);
  return screen.getAllByRole("button", {
    name: (name: string) => name.includes(label),
  })[0];
}

function cellFor(iso: string): HTMLElement[] {
  return dayCells().filter((el) =>
    (el.getAttribute("aria-label") ?? "").startsWith(iso),
  );
}

describe("month paging does not accumulate cells", () => {
  it("keeps a stable cell count across repeated chevron clicks", () => {
    const { container } = renderCalendar({
      from: "2026-08-13",
      to: "2026-08-29",
    });
    const before = gridChildCounts(container);
    // 7 weekday headers + 42 grid cells, per rendered month.
    expect(before.every((n) => n === 49)).toBe(true);

    // The reported repro: hit the chevron several times and watch the grid
    // grow. Any accumulation shows up as a rising child count.
    const next = chevron("next_month_aria");
    for (let i = 0; i < 5; i += 1) fireEvent.click(next);

    expect(gridChildCounts(container)).toEqual(before);
    expect(dayCells().length).toBeGreaterThan(0);
  });

  it("returns to the same cell count after paging forward and back", () => {
    const { container } = renderCalendar({
      from: "2026-08-13",
      to: "2026-08-29",
    });
    const before = gridChildCounts(container);

    const next = chevron("next_month_aria");
    const prev = chevron("prev_month_aria");
    fireEvent.click(next);
    fireEvent.click(next);
    fireEvent.click(prev);
    fireEvent.click(prev);

    expect(gridChildCounts(container)).toEqual(before);
  });
});

describe("both range ends render in both columns", () => {
  it("marks the start AND the end as selected", () => {
    // 13 and 29 are both in August, so both columns show both dates. Before the
    // fix the left column marked only 13 and the right only 29.
    renderCalendar({ from: "2026-08-13", to: "2026-08-29" });

    const starts = cellFor("2026-08-13");
    const ends = cellFor("2026-08-29");
    expect(starts.length).toBeGreaterThan(0);
    expect(ends.length).toBeGreaterThan(0);

    // Every rendering of either end announces itself as selected.
    for (const el of [...starts, ...ends]) {
      expect(el.getAttribute("aria-label")).toMatch(/\(.+\)$/);
    }
  });

  it("does not mark a day outside the range as selected", () => {
    renderCalendar({ from: "2026-08-13", to: "2026-08-29" });
    for (const el of cellFor("2026-08-05")) {
      expect(el.getAttribute("aria-label")).toBe("2026-08-05");
    }
  });

  it("marks the single day of a one-day range", () => {
    renderCalendar({ from: "2026-08-13", to: "2026-08-13" });
    const cells = cellFor("2026-08-13");
    expect(cells.length).toBeGreaterThan(0);
    for (const el of cells) {
      expect(el.getAttribute("aria-label")).toMatch(/\(.+\)$/);
    }
  });
});
