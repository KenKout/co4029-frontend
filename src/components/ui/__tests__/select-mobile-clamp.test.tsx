import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";

import { Select } from "@/components/ui/select";

/**
 * Mobile viewport safety: a very long option label (the quiz matching input
 * hands this popup full choice sentences) must not widen the popup past the
 * viewport. The clamp rides Base UI's `--available-width` custom property,
 * which only exists on the real positioned popup — so assert the class is on
 * the rendered popup and that every option row stays inside its width via the
 * min-width/max-width cascade (min-width loses when max-width is smaller).
 */

const LONG_LABEL =
  "Enterprise resource planning system integration and legacy data warehouse synchronization";

function Harness() {
  const [value, setValue] = React.useState("");
  return (
    <Select
      aria-label="Match for: prompt"
      value={value}
      onValueChange={setValue}
      options={[
        { value: "long", label: LONG_LABEL },
        { value: "a", label: "Short A" },
      ]}
    />
  );
}

describe("Select mobile popup clamping", () => {
  it("clamps popup width to the space left of the trigger (no viewport overflow)", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("combobox", { name: "Match for: prompt" }));

    const listbox = screen.getByRole("listbox");
    // The width clamp must consume --available-width (Base UI sets it on the
    // positioner), with the same 0.5rem gutter the popup keeps on screen.
    // Applied below `sm` only — desktop popups keep their free growth.
    expect(listbox.className).toContain(
      "max-sm:max-w-[min(calc(var(--available-width)-0.5rem),20rem)]",
    );
    // Cascade contract the clamp relies on: min-w can stretch to the trigger,
    // but max-w still wins when it is smaller.
    expect(listbox.className).toContain("min-w-(--anchor-width)");

    // Every option (incl. the long label, wrapped by truncate) is listed.
    expect(screen.getByRole("option", { name: LONG_LABEL })).toBeInTheDocument();
  });
});
