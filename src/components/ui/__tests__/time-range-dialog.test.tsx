import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  TimeRangeSelect,
  type TimeRange,
} from "../data-table-toolbar";

const OPTIONS = [
  { value: "today" as TimeRange, label: "Today" },
  { value: "week" as TimeRange, label: "Last 7 days" },
];

describe("TimeRangeSelect custom-range dialog", () => {
  it("opens the dialog on first pick of the custom option", async () => {
    const user = userEvent.setup();
    const onRangeChange = vi.fn();
    const onCustomChange = vi.fn();
    render(
      <TimeRangeSelect
        value="week"
        onChange={onRangeChange}
        options={OPTIONS}
        onCustomRangeChange={onCustomChange}
        labels={{
          customOption: "Custom range…",
          dialogTitle: "Custom range",
        }}
        className="w-44"
      />,
    );

    // Open the select and pick the custom option.
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Custom range…" }));

    // The dialog title should appear — this is the FIRST time.
    await waitFor(() => {
      expect(screen.queryByText("Custom range")).not.toBeNull();
    });
  });
});