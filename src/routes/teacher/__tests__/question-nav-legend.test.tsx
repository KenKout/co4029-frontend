import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { PreviewCard } from "@base-ui/react/preview-card";

/**
 * Verifies the status legend is a HOVER POPOVER on the "Jump to question"
 * title rather than a permanent block under the navigator grid.
 *
 * This mounts the same PreviewCard composition the navigator uses (importing
 * the real QuestionNavigator would drag in the whole quiz-manage route: router,
 * query client, i18n and a dozen API hooks). The point under test is the
 * interaction contract — hidden until hover, revealed on hover — which is
 * entirely a property of this composition.
 */

function LegendPopover() {
  return (
    <PreviewCard.Root>
      <PreviewCard.Trigger
        render={
          <h2 className="flex cursor-help items-center gap-1.5">
            Jump to question
          </h2>
        }
      />
      <PreviewCard.Portal>
        <PreviewCard.Positioner side="right" align="start" sideOffset={10}>
          <PreviewCard.Popup>
            <p>What the colours mean</p>
            <ul>
              <li>Approved</li>
              <li>Pending review</li>
              <li>Error</li>
              <li>Unsaved</li>
              <li>Viewing</li>
              <li>Selected</li>
            </ul>
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}

describe("question navigator status legend", () => {
  it("is hidden until the title is hovered", () => {
    render(<LegendPopover />);
    // Title is always visible...
    expect(screen.getByText("Jump to question")).toBeInTheDocument();
    // ...but the legend takes up no space in the sidebar by default.
    expect(screen.queryByText("What the colours mean")).not.toBeInTheDocument();
    expect(screen.queryByText("Approved")).not.toBeInTheDocument();
  });

  it("reveals all six status rows on hover", async () => {
    const user = userEvent.setup();
    render(<LegendPopover />);

    await user.hover(screen.getByText("Jump to question"));

    await waitFor(
      () => {
        expect(screen.getByText("What the colours mean")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    for (const label of [
      "Approved",
      "Pending review",
      "Error",
      "Unsaved",
      "Viewing",
      "Selected",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
