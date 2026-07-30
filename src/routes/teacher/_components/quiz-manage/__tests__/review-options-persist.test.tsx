import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ReviewOptionsMatrix } from "../ReviewOptionsMatrix";
import type { ReviewOptions } from "@/lib/api/hooks/quizzes";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && "shown" in opts ? `${opts.shown}/${opts.total}` : key,
  }),
}));

const K = "teacher_quiz_manage.settings.review";

function flags(on: boolean) {
  return {
    show_score: on,
    show_correctness: on,
    show_correct_answers: on,
    show_explanation: on,
    show_points: on,
  };
}

/**
 * Regression guard for the "preset panel keeps collapsing" bug.
 *
 * Root cause was in quiz-manage.tsx: LockableSection was declared INSIDE
 * SettingsTab, so each render produced a new component function, React saw a
 * new element type, and the whole subtree remounted — resetting the local
 * expand/collapse state in ReviewOptionsMatrix.
 *
 * `StableWrapper` mirrors the fixed structure (wrapper defined once, at module
 * scope). `UnstableWrapper` reproduces the bug by redefining the wrapper on
 * every render, proving these tests actually detect the regression.
 */
function StableWrapper({ children }: { children: React.ReactNode }) {
  return <fieldset>{children}</fieldset>;
}

function Host({
  unstable,
  initial,
}: {
  unstable: boolean;
  initial: ReviewOptions;
}) {
  const [value, setValue] = useState(initial);
  const [tick, setTick] = useState(0);

  // Re-created every render — the shape of the original bug.
  function UnstableWrapper({ children }: { children: React.ReactNode }) {
    return <fieldset>{children}</fieldset>;
  }
  const Wrapper = unstable ? UnstableWrapper : StableWrapper;

  return (
    <div>
      {/* Stands in for any other field in the form (e.g. the title input):
          editing it re-renders SettingsTab without touching review options. */}
      <button type="button" onClick={() => setTick((n) => n + 1)}>
        other-field-edit
      </button>
      <span data-testid="tick">{tick}</span>
      <Wrapper>
        <ReviewOptionsMatrix value={value} onChange={setValue} />
      </Wrapper>
    </div>
  );
}

const customValue: ReviewOptions = {
  immediately_after: { ...flags(true), show_points: false },
  later_while_open: flags(true),
  after_close: flags(true),
};

describe("review options panel stability", () => {
  it("keeps the detail panel open when an unrelated field re-renders the form", async () => {
    const user = userEvent.setup();
    render(<Host unstable={false} initial={customValue} />);

    // A custom matrix starts expanded, so the windows are visible.
    expect(screen.getByText(`${K}.windows.after_close`)).toBeInTheDocument();

    await user.click(screen.getByText("other-field-edit"));
    expect(screen.getByTestId("tick")).toHaveTextContent("1");

    // Still open — this is what regressed before the hoist.
    expect(screen.getByText(`${K}.windows.after_close`)).toBeInTheDocument();
  });

  it("keeps a manually expanded panel open across re-renders", async () => {
    const user = userEvent.setup();
    // All-true matches a preset, so it starts collapsed.
    render(
      <Host
        unstable={false}
        initial={{
          immediately_after: flags(true),
          later_while_open: flags(true),
          after_close: flags(true),
        }}
      />,
    );
    expect(
      screen.queryByText(`${K}.windows.after_close`),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: `${K}.customize` }));
    expect(screen.getByText(`${K}.windows.after_close`)).toBeInTheDocument();

    await user.click(screen.getByText("other-field-edit"));

    expect(screen.getByText(`${K}.windows.after_close`)).toBeInTheDocument();
  });

  it("selecting a preset does not collapse the open panel", async () => {
    const user = userEvent.setup();
    render(<Host unstable={false} initial={customValue} />);

    expect(screen.getByText(`${K}.windows.after_close`)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: `${K}.presets.nothing_until_close` }),
    );

    // Panel stays open so you can see what the preset just did.
    expect(screen.getByText(`${K}.windows.after_close`)).toBeInTheDocument();
    const counts = screen.getAllByText(/^\d\/5$/).map((el) => el.textContent);
    expect(counts).toEqual(["0/5", "0/5", "5/5"]);
  });

  it("a re-created wrapper DOES collapse the panel (proves the guard works)", async () => {
    const user = userEvent.setup();
    // Must start from a preset-matching matrix: that initialises collapsed, so
    // a remount is observable as the panel snapping shut again. With a custom
    // matrix the initial state is already `expanded`, so a remount re-expands
    // and the lost state would be invisible.
    render(
      <Host
        unstable
        initial={{
          immediately_after: flags(true),
          later_while_open: flags(true),
          after_close: flags(true),
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: `${K}.customize` }));
    expect(screen.getByText(`${K}.windows.after_close`)).toBeInTheDocument();

    await user.click(screen.getByText("other-field-edit"));

    // Remounted → local state lost → collapsed. The exact reported bug.
    expect(
      screen.queryByText(`${K}.windows.after_close`),
    ).not.toBeInTheDocument();
  });
});
