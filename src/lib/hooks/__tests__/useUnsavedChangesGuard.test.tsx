import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";

import { useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";

/**
 * The shared "Are you sure you want to quit?" guard used by the quiz-manage tab
 * strip, the KG editor close paths, and the lesson-edit back link.
 *
 * NOTE: the shared test setup forces i18n to Vietnamese, so assertions match on
 * roles rather than English label text.
 */

function Harness({
  dirty,
  onAction,
}: {
  dirty: boolean;
  onAction: () => void;
}) {
  const guard = useUnsavedChangesGuard(dirty);
  return (
    <div>
      <button type="button" onClick={() => guard.run(onAction)}>
        leave
      </button>
      <span data-testid="asking">{String(guard.isAsking)}</span>
      {guard.dialog}
    </div>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("useUnsavedChangesGuard", () => {
  it("runs the action immediately when nothing is dirty", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<Harness dirty={false} onAction={action} />);

    await user.click(screen.getByRole("button", { name: "leave" }));

    expect(action).toHaveBeenCalledTimes(1);
    // No dialog — a clean screen must never nag.
    expect(screen.getByTestId("asking").textContent).toBe("false");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("holds the action and asks first when dirty", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<Harness dirty onAction={action} />);

    await user.click(screen.getByRole("button", { name: "leave" }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByTestId("asking").textContent).toBe("true");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("runs the held action only after confirming", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<Harness dirty onAction={action} />);

    await user.click(screen.getByRole("button", { name: "leave" }));
    const dialog = screen.getByRole("alertdialog");
    // Confirm is the last button in the dialog's action row.
    const buttons = Array.from(dialog.querySelectorAll("button"));
    await user.click(buttons[buttons.length - 1]);

    expect(action).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("asking").textContent).toBe("false");
  });

  it("discards the held action when cancelled", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<Harness dirty onAction={action} />);

    await user.click(screen.getByRole("button", { name: "leave" }));
    const dialog = screen.getByRole("alertdialog");
    const buttons = Array.from(dialog.querySelectorAll("button"));
    // Cancel sits before Confirm in the action row.
    await user.click(buttons[buttons.length - 2]);

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByTestId("asking").textContent).toBe("false");
  });

  it("stores the action as a value, not a state updater", async () => {
    // Regression guard: setState(fn) treats fn as an updater and would invoke it
    // immediately, firing the navigation before the user ever confirms.
    const user = userEvent.setup();
    const action = vi.fn();
    render(<Harness dirty onAction={action} />);

    await user.click(screen.getByRole("button", { name: "leave" }));
    // Dialog is open and the action has NOT run yet.
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it("installs a beforeunload guard only while dirty", () => {
    const addSpy = vi.spyOn(window, "addEventListener");

    const { unmount } = render(<Harness dirty={false} onAction={() => {}} />);
    expect(
      addSpy.mock.calls.filter((c) => c[0] === "beforeunload"),
    ).toHaveLength(0);
    unmount();

    addSpy.mockClear();
    render(<Harness dirty onAction={() => {}} />);
    expect(
      addSpy.mock.calls.filter((c) => c[0] === "beforeunload").length,
    ).toBeGreaterThan(0);
  });

  it("removes the beforeunload guard once clean again", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    function Wrapper() {
      const [dirty, setDirty] = React.useState(true);
      return (
        <div>
          <button type="button" onClick={() => setDirty(false)}>
            save
          </button>
          <Harness dirty={dirty} onAction={() => {}} />
        </div>
      );
    }
    render(<Wrapper />);
    removeSpy.mockClear();
    act(() => {
      screen.getByRole("button", { name: "save" }).click();
    });
    expect(
      removeSpy.mock.calls.filter((c) => c[0] === "beforeunload").length,
    ).toBeGreaterThan(0);
  });
});
