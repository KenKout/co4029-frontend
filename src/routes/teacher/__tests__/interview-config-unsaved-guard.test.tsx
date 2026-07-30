import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Unsaved-changes guard when leaving the Settings tab of interview-config.
 *
 * The real route drags in the router, query client, i18n and a dozen API hooks,
 * so this mounts a miniature host that reproduces the exact contract under test:
 * a tab switch is intercepted while the settings draft is dirty, and the dialog's
 * two buttons are two REAL choices ("Save now" persists then switches, "Later"
 * switches and keeps the draft) rather than confirm/cancel.
 *
 * The subtle bit worth pinning: the secondary button is rendered inside
 * AlertDialog.Close, which also fires `onOpenChange(false)`. If that ran before
 * `onCancel`, the pending tab would already be cleared and "Later" would close
 * the dialog without switching — the exact bug this asserts against.
 */

type TabId = "settings" | "questions";

function Host({
  dirty,
  saveSucceeds = true,
  onSaved,
}: {
  dirty: boolean;
  saveSucceeds?: boolean;
  onSaved?: () => void;
}) {
  const [activeTab, setActiveTab] = React.useState<TabId>("settings");
  const [pendingTab, setPendingTab] = React.useState<TabId | null>(null);

  function requestTabChange(next: TabId) {
    if (next === activeTab) return;
    if (activeTab === "settings" && dirty) {
      setPendingTab(next);
      return;
    }
    setActiveTab(next);
  }

  function discardSaveAndSwitch() {
    const next = pendingTab;
    setPendingTab(null);
    if (next) setActiveTab(next);
  }

  async function saveAndSwitch() {
    const next = pendingTab;
    const ok = saveSucceeds;
    onSaved?.();
    if (!ok) return;
    setPendingTab(null);
    if (next) setActiveTab(next);
  }

  return (
    <div>
      <span data-testid="active">{activeTab}</span>
      <button type="button" onClick={() => requestTabChange("questions")}>
        Go to questions
      </button>
      <ConfirmDialog
        open={pendingTab !== null}
        onOpenChange={(open) => {
          if (!open) setPendingTab(null);
        }}
        title="Save your changes?"
        description="You have unsaved changes in Settings."
        confirmLabel="Save now"
        cancelLabel="Later"
        confirmVariant="default"
        onConfirm={saveAndSwitch}
        onCancel={discardSaveAndSwitch}
        dismissOnBackdrop
      />
    </div>
  );
}

describe("interview-config unsaved-changes guard", () => {
  it("switches straight away when there are no unsaved changes", async () => {
    const user = userEvent.setup();
    render(<Host dirty={false} />);

    await user.click(screen.getByRole("button", { name: "Go to questions" }));

    expect(screen.getByTestId("active")).toHaveTextContent("questions");
    expect(screen.queryByText("Save your changes?")).not.toBeInTheDocument();
  });

  it("blocks the switch and prompts when the draft is dirty", async () => {
    const user = userEvent.setup();
    render(<Host dirty />);

    await user.click(screen.getByRole("button", { name: "Go to questions" }));

    expect(await screen.findByText("Save your changes?")).toBeInTheDocument();
    // Still on Settings until the teacher answers.
    expect(screen.getByTestId("active")).toHaveTextContent("settings");
  });

  it("'Save now' saves and then switches", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<Host dirty onSaved={onSaved} />);

    await user.click(screen.getByRole("button", { name: "Go to questions" }));
    await user.click(await screen.findByRole("button", { name: "Save now" }));

    expect(onSaved).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.getByTestId("active")).toHaveTextContent("questions"),
    );
  });

  it("'Save now' does NOT switch when the save fails", async () => {
    const user = userEvent.setup();
    render(<Host dirty saveSucceeds={false} />);

    await user.click(screen.getByRole("button", { name: "Go to questions" }));
    await user.click(await screen.findByRole("button", { name: "Save now" }));

    // The teacher stays on Settings so the failure is actionable.
    expect(screen.getByTestId("active")).toHaveTextContent("settings");
  });

  it("'Later' switches tab and keeps the unsaved draft", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<Host dirty onSaved={onSaved} />);

    await user.click(screen.getByRole("button", { name: "Go to questions" }));
    await user.click(await screen.findByRole("button", { name: "Later" }));

    // Regression guard: Close also fires onOpenChange(false); if that cleared
    // pendingTab first, this would still read "settings".
    await waitFor(() =>
      expect(screen.getByTestId("active")).toHaveTextContent("questions"),
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("Escape cancels the switch and stays on Settings", async () => {
    const user = userEvent.setup();
    render(<Host dirty />);

    await user.click(screen.getByRole("button", { name: "Go to questions" }));
    expect(await screen.findByText("Save your changes?")).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByText("Save your changes?")).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId("active")).toHaveTextContent("settings");
  });
});
