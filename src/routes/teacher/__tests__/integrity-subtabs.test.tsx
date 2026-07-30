import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";

// Mocked before the SUT import so the component picks up the stub.
const mockEvents = vi.hoisted(() => ({ current: [] as unknown[] }));

vi.mock("@/lib/api/hooks/interviews", () => ({
  useInterviewIntegrityEvents: () => ({
    data: { events: mockEvents.current },
    isLoading: false,
  }),
  // The module is imported for several hooks; the card only uses the one above,
  // but the import must not blow up on the missing names.
  useInterviewTranscript: () => ({ data: { turns: [] }, isLoading: false }),
  useTeacherInterviewSession: () => ({ data: null, isLoading: false }),
  useInterviewGapReport: () => ({ data: null, isLoading: false }),
  useUpdateGapReportNotes: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { IntegrityCard } from "@/routes/teacher/interview-gap-report";

/**
 * The Integrity tab splits into four sub-tabs: all signals, tab switches,
 * fullscreen exits, focus losses. Each shows ONLY its own event type.
 *
 * Worth pinning because the failure mode is silent: a filter that quietly
 * returns everything still looks plausible on screen (the list is long either
 * way), and a teacher reviewing a session would draw conclusions from the wrong
 * rows. So each assertion checks both that the wanted type is present AND that
 * the other types are gone.
 */

function event(id: string, type: string, severity: string) {
  return {
    id,
    event_type: type,
    severity,
    created_at: "2026-07-24T20:12:00Z",
  };
}

// 2 tab switches, 1 fullscreen exit, 3 focus losses = 6 total.
const EVENTS = [
  event("1", "focus_lost", "info"),
  event("2", "tab_switch", "warning"),
  event("3", "focus_lost", "info"),
  event("4", "tab_switch", "warning"),
  event("5", "fullscreen_exit", "warning"),
  event("6", "focus_lost", "info"),
];

const LABEL = {
  total: /All signals|Tất cả tín hiệu/,
  tabSwitch:
    /Switched away from the interview tab|Đã chuyển khỏi tab phỏng vấn/,
  fullscreen: /Exited fullscreen|Đã thoát toàn màn hình/,
  focusLost: /Interview window lost focus|Cửa sổ phỏng vấn mất tiêu điểm/,
};

function renderCard(events: unknown[] = EVENTS) {
  mockEvents.current = events;
  return render(<IntegrityCard sessionId="s-1" />);
}

/** The timeline list, excluding the filter tabs above it. */
function timeline(): HTMLElement {
  const list = document.querySelector("ol");
  expect(list, "no timeline <ol> rendered").not.toBeNull();
  return list as HTMLElement;
}

function tab(label: RegExp): HTMLElement | undefined {
  // queryAllByRole (not getAllByRole): the clean-session state renders no
  // buttons at all, and that case asserts on the absence.
  return screen
    .queryAllByRole("button")
    .find((b) => label.test(b.textContent ?? ""));
}

/** `tab` for the cases that require it to exist. */
function requireTab(label: RegExp): HTMLElement {
  const found = tab(label);
  expect(found, `no tab matching ${label}`).toBeDefined();
  return found!;
}

describe("Integrity sub-tabs", () => {
  it("renders four filter tabs with their own counts", () => {
    renderCard();
    for (const label of Object.values(LABEL)) {
      expect(tab(label), `no tab for ${label}`).toBeDefined();
    }
    // Counts are the headline number on each tab.
    expect(requireTab(LABEL.total)).toHaveTextContent("6");
    expect(requireTab(LABEL.tabSwitch)).toHaveTextContent("2");
    expect(requireTab(LABEL.fullscreen)).toHaveTextContent("1");
    expect(requireTab(LABEL.focusLost)).toHaveTextContent("3");
  });

  it("starts on All signals showing every event", () => {
    renderCard();
    expect(requireTab(LABEL.total)).toHaveAttribute("aria-pressed", "true");
    expect(timeline().querySelectorAll("li")).toHaveLength(6);
  });

  it("shows only tab switches when that sub-tab is clicked", async () => {
    renderCard();
    await userEvent.click(requireTab(LABEL.tabSwitch));

    const rows = timeline();
    expect(rows.querySelectorAll("li")).toHaveLength(2);
    expect(within(rows).getAllByText(LABEL.tabSwitch)).toHaveLength(2);
    // The whole point: other types must be gone, not merely outnumbered.
    expect(within(rows).queryByText(LABEL.focusLost)).not.toBeInTheDocument();
    expect(within(rows).queryByText(LABEL.fullscreen)).not.toBeInTheDocument();
  });

  it("shows only focus losses when that sub-tab is clicked", async () => {
    renderCard();
    await userEvent.click(requireTab(LABEL.focusLost));

    const rows = timeline();
    expect(rows.querySelectorAll("li")).toHaveLength(3);
    expect(within(rows).getAllByText(LABEL.focusLost)).toHaveLength(3);
    expect(within(rows).queryByText(LABEL.tabSwitch)).not.toBeInTheDocument();
  });

  it("shows only the fullscreen exit when that sub-tab is clicked", async () => {
    renderCard();
    await userEvent.click(requireTab(LABEL.fullscreen));

    const rows = timeline();
    expect(rows.querySelectorAll("li")).toHaveLength(1);
    expect(within(rows).getAllByText(LABEL.fullscreen)).toHaveLength(1);
  });

  it("moves aria-pressed to the selected sub-tab", async () => {
    renderCard();
    await userEvent.click(requireTab(LABEL.tabSwitch));
    expect(requireTab(LABEL.tabSwitch)).toHaveAttribute("aria-pressed", "true");
    expect(requireTab(LABEL.total)).toHaveAttribute("aria-pressed", "false");
  });

  it("returns to the full list when All signals is clicked again", async () => {
    renderCard();
    await userEvent.click(requireTab(LABEL.tabSwitch));
    expect(timeline().querySelectorAll("li")).toHaveLength(2);
    await userEvent.click(requireTab(LABEL.total));
    expect(timeline().querySelectorAll("li")).toHaveLength(6);
  });

  it("explains an empty bucket instead of showing a blank list", async () => {
    // A zero-count tab is still clickable — it has to say why nothing is there.
    renderCard([event("1", "focus_lost", "info")]);
    await userEvent.click(requireTab(LABEL.fullscreen));

    expect(document.querySelector("ol")).toBeNull();
    expect(
      screen.getByText(
        /No events of this type|không ghi nhận sự kiện nào thuộc loại này/i,
      ),
    ).toBeInTheDocument();
  });

  it("keeps the clean-session state when there are no events at all", () => {
    // The four tabs only make sense once something was recorded; an untouched
    // session should still get the reassuring green panel, not four zeroes.
    renderCard([]);
    expect(tab(LABEL.total)).toBeUndefined();
    expect(document.querySelector("ol")).toBeNull();
  });

  it("gives the sub-tabs a hover affordance", () => {
    renderCard();
    // Hover/press feedback is the requested part of the redesign; assert the
    // classes exist so a refactor cannot silently drop them.
    const cls = requireTab(LABEL.tabSwitch).className;
    expect(cls).toMatch(/hover:/);
    expect(cls).toMatch(/cursor-pointer/);
    expect(cls).toMatch(/transition/);
  });
});
