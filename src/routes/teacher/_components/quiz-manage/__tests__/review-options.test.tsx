import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  ReviewOptionsMatrix,
  defaultReviewOptions,
} from "../ReviewOptionsMatrix";
import type { ReviewOptions } from "@/lib/api/hooks/quizzes";

// Render the raw i18n key so assertions don't depend on copy.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && "shown" in opts ? `${opts.shown}/${opts.total}` : key,
  }),
}));

const K = "teacher_quiz_manage.settings.review";

/** Controlled wrapper so toggles round-trip like they do in the settings form. */
function Harness({ initial }: { initial: ReviewOptions }) {
  const [value, setValue] = useState(initial);
  return <ReviewOptionsMatrix value={value} onChange={setValue} />;
}

function flags(on: boolean) {
  return {
    show_score: on,
    show_correctness: on,
    show_correct_answers: on,
    show_explanation: on,
    show_points: on,
  };
}

function allFalse(): ReviewOptions {
  return {
    immediately_after: flags(false),
    later_while_open: flags(false),
    after_close: flags(false),
  };
}

/**
 * The detail panel starts collapsed whenever a preset already describes the
 * config, so tests that inspect individual flags must open it first.
 */
async function expand(user: ReturnType<typeof userEvent.setup>) {
  const toggle = screen.getByRole("button", { name: `${K}.customize` });
  if (toggle.getAttribute("aria-expanded") === "false") await user.click(toggle);
}

function windowGroup(win: string): HTMLElement {
  return screen.getByText(`${K}.windows.${win}`).closest("fieldset")!;
}

function shownCounts() {
  return screen.getAllByText(/^\d\/5$/).map((el) => el.textContent);
}

describe("ReviewOptionsMatrix", () => {
  it("collapses the detail panel while a preset describes the config", () => {
    render(<Harness initial={defaultReviewOptions()} />);
    expect(
      screen.getByRole("button", { name: `${K}.customize` }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("labels every control, so no checkbox depends on a row/column lookup", async () => {
    const user = userEvent.setup();
    render(<Harness initial={defaultReviewOptions()} />);
    await expand(user);

    // 3 windows x 5 flags, each reachable by its own accessible name.
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(15);
    for (const box of boxes) {
      expect(box).toHaveAccessibleName();
    }
  });

  it("marks the matching preset as pressed instead of showing Custom", () => {
    render(<Harness initial={defaultReviewOptions()} />);
    expect(
      screen.getByRole("button", { name: `${K}.presets.everything` }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText(`${K}.presets.custom`)).not.toBeInTheDocument();
  });

  it("applies a preset as a complete matrix, not a merge", async () => {
    const user = userEvent.setup();
    render(<Harness initial={defaultReviewOptions()} />);

    await user.click(
      screen.getByRole("button", { name: `${K}.presets.nothing_until_close` }),
    );
    await expand(user);

    // after_close keeps all 5; the two earlier windows drop to 0.
    expect(shownCounts()).toEqual(["0/5", "0/5", "5/5"]);
  });

  it("falls back to Custom once a single flag deviates from every preset", async () => {
    const user = userEvent.setup();
    render(<Harness initial={defaultReviewOptions()} />);
    await expand(user);

    await user.click(
      within(windowGroup("immediately_after")).getByRole("checkbox", {
        name: `${K}.flags.show_points`,
      }),
    );

    expect(screen.getByText(`${K}.presets.custom`)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `${K}.presets.everything` }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("show-all acts only on its own window", async () => {
    const user = userEvent.setup();
    render(<Harness initial={allFalse()} />);
    await expand(user);

    await user.click(
      within(windowGroup("later_while_open")).getByRole("button", {
        name: `${K}.show_all`,
      }),
    );

    expect(shownCounts()).toEqual(["0/5", "5/5", "0/5"]);
  });

  it("keeps the underlying 3x5 shape intact when toggling one flag", async () => {
    const user = userEvent.setup();
    const seen: ReviewOptions[] = [];
    function Spy() {
      const [value, setValue] = useState(defaultReviewOptions());
      return (
        <ReviewOptionsMatrix
          value={value}
          onChange={(next) => {
            seen.push(next);
            setValue(next);
          }}
        />
      );
    }
    render(<Spy />);
    await expand(user);

    await user.click(
      within(windowGroup("after_close")).getByRole("checkbox", {
        name: `${K}.flags.show_explanation`,
      }),
    );

    // Index rather than .at(-1): the project's tsc target predates ES2022.
    const last = seen[seen.length - 1];
    expect(Object.keys(last).sort()).toEqual([
      "after_close",
      "immediately_after",
      "later_while_open",
    ]);
    expect(last.after_close.show_explanation).toBe(false);
    // Only the one flag moved.
    expect(last.after_close.show_score).toBe(true);
    expect(last.immediately_after).toEqual(flags(true));
  });
});
