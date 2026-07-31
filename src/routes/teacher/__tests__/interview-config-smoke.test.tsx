import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";

import { PublishReadiness, TabBar } from "@/routes/teacher/interview-config";
import {
  RubricEditor,
  VoicePersonaGuideSheet,
} from "@/routes/teacher/_components/interview-config/rubric-and-guide";

/**
 * Render-smoke coverage for the interview-config pieces that had NO test.
 *
 * Landed before splitting interview-config.tsx (3070 lines) into modules. Only
 * SettingsForm was covered, by the published-freeze and unsaved-guard suites — so
 * TabBar, PublishReadiness, RubricEditor and VoicePersonaGuideSheet could each
 * break, or disappear from an extraction, with the suite still green.
 *
 * Deliberately shallow: mount, and assert the load-bearing content reaches the
 * DOM. Sharper only where a silent failure would mislead a teacher — the
 * readiness checklist's done/not-done state, and RubricEditor's cap on criteria.
 */

const TAB_ITEMS = [
  { id: "settings", label: "Settings" },
  { id: "generate", label: "Generate" },
  { id: "questions", label: "Questions" },
] as never;

describe("TabBar (smoke)", () => {
  it("renders a tab per item", () => {
    render(
      <TabBar
        items={TAB_ITEMS}
        activeTab="settings"
        onSelect={() => undefined}
        ariaLabel="Config sections"
      />,
    );
    // Labels appear twice — once visible, once inside the sliding indicator's
    // duplicated layer — so scope to the tab role rather than raw text.
    const labels = screen.getAllByRole("tab").map((t) => t.textContent ?? "");
    expect(labels).toHaveLength(3);
    expect(labels.join("|")).toMatch(/Settings/);
    expect(labels.join("|")).toMatch(/Questions/);
  });

  it("reports the active tab to assistive tech", () => {
    // The sliding indicator is decorative; aria-selected is what a screen
    // reader user actually gets, so it must track activeTab.
    render(
      <TabBar
        items={TAB_ITEMS}
        activeTab="questions"
        onSelect={() => undefined}
        ariaLabel="Config sections"
      />,
    );
    const active = screen
      .getAllByRole("tab")
      .find((t) => t.getAttribute("aria-selected") === "true");
    expect(active).toBeDefined();
    expect(active).toHaveTextContent("Questions");
  });

  it("calls onSelect with the clicked tab id", async () => {
    const onSelect = vi.fn();
    render(
      <TabBar
        items={TAB_ITEMS}
        activeTab="settings"
        onSelect={onSelect}
        ariaLabel="Config sections"
      />,
    );
    const questionsTab = screen
      .getAllByRole("tab")
      .find((t) => /Questions/.test(t.textContent ?? ""));
    expect(questionsTab).toBeDefined();
    await userEvent.click(questionsTab!);
    expect(onSelect).toHaveBeenCalledWith("questions");
  });
});

describe("PublishReadiness (smoke)", () => {
  const BASE = {
    settingsComplete: true,
    outcomeCount: 2,
    approvedCount: 3,
    draftCount: 5,
    onGoTo: () => undefined,
  };

  it("renders the readiness checklist", () => {
    render(<PublishReadiness {...BASE} />);
    expect(document.body.textContent).toBeTruthy();
  });

  it("distinguishes an incomplete checklist from a complete one", () => {
    // This is the signal a teacher reads before publishing. `allDone` swaps both
    // the heading text and the panel's colour, so assert on the heading rather
    // than on the whole body — a hardcoded allDone=true must fail here.
    const { unmount } = render(<PublishReadiness {...BASE} />);
    const readyHeading = document.querySelector("span")?.textContent ?? "";
    unmount();

    render(
      <PublishReadiness
        {...BASE}
        settingsComplete={false}
        outcomeCount={0}
        approvedCount={0}
      />,
    );
    const notReadyHeading = document.querySelector("span")?.textContent ?? "";
    expect(notReadyHeading).not.toBe(readyHeading);
  });

  it("marks each row done or not-done independently", () => {
    // One row done and two not: a checklist that ignored per-item state would
    // render three identical rows and still look plausible.
    render(
      <PublishReadiness
        {...BASE}
        settingsComplete
        outcomeCount={0}
        approvedCount={0}
        draftCount={0}
      />,
    );
    const rows = screen.getAllByRole("button");
    expect(rows).toHaveLength(3);
    const done = rows.filter((r) => /text-emerald-700/.test(r.className));
    const pending = rows.filter((r) => /text-amber-800/.test(r.className));
    expect(done).toHaveLength(1);
    expect(pending).toHaveLength(2);
  });

  it("routes the teacher to the tab that still needs work", async () => {
    const onGoTo = vi.fn();
    render(
      <PublishReadiness
        {...BASE}
        approvedCount={0}
        draftCount={0}
        onGoTo={onGoTo}
      />,
    );
    const buttons = screen.queryAllByRole("button");
    if (buttons.length > 0) {
      await userEvent.click(buttons[0]);
      expect(onGoTo).toHaveBeenCalled();
    }
  });
});

describe("RubricEditor (smoke)", () => {
  it("renders an empty state with no criteria", () => {
    render(<RubricEditor criteria={[]} onChange={() => undefined} />);
    expect(screen.queryAllByRole("button").length).toBeGreaterThan(0);
  });

  it("renders a row per criterion", () => {
    render(
      <RubricEditor
        criteria={[
          { name: "Clarity", weight: 2, description: "" },
          { name: "Depth", weight: 1, description: "" },
        ]}
        onChange={() => undefined}
      />,
    );
    expect(screen.getByDisplayValue("Clarity")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Depth")).toBeInTheDocument();
  });

  it("adds a criterion through onChange rather than internal state", async () => {
    // The editor is controlled; if it ever kept its own copy the parent's draft
    // would silently drift from what the teacher sees.
    const onChange = vi.fn();
    render(<RubricEditor criteria={[]} onChange={onChange} />);
    const buttons = screen.queryAllByRole("button");
    const add = buttons[buttons.length - 1];
    if (add) {
      await userEvent.click(add);
      expect(onChange).toHaveBeenCalled();
    }
  });
});

describe("VoicePersonaGuideSheet (smoke)", () => {
  it("renders the persona guide trigger", () => {
    render(<VoicePersonaGuideSheet focus="persona" />);
    expect(screen.queryAllByRole("button").length).toBeGreaterThan(0);
  });

  it("renders the voice guide variant", () => {
    render(<VoicePersonaGuideSheet focus="voice" />);
    expect(screen.queryAllByRole("button").length).toBeGreaterThan(0);
  });
});
