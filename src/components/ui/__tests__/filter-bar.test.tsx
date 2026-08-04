import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FilterBar, type FilterDef } from "../filter-bar";

const defs: FilterDef[] = [
  {
    id: "status",
    label: "Status",
    allLabel: "All statuses",
    options: [
      { value: "draft", label: "Draft" },
      { value: "published", label: "Published" },
    ],
  },
  {
    id: "time",
    label: "Time",
    allLabel: "All time",
    // Callers' option lists may already carry an "all" row (the teacher
    // filter bars' constants do) — the component must not render it twice.
    options: [
      { value: "all", label: "All time" },
      { value: "7", label: "Last 7 days" },
    ],
  },
];

describe("shared FilterBar", () => {
  it("renders every filter as a styled combobox, never a native <select>", () => {
    render(<FilterBar filters={defs} values={{}} onChange={vi.fn()} />);
    expect(
      screen.getByRole("combobox", { name: "Status" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Time" })).toBeInTheDocument();
    expect(document.querySelectorAll("select").length).toBe(0);
  });

  it("calls onChange with the picked value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FilterBar filters={defs} values={{}} onChange={onChange} />);
    await user.click(screen.getByRole("combobox", { name: "Status" }));
    await user.click(await screen.findByText("Draft"));
    expect(onChange).toHaveBeenCalledWith("status", "draft");
  });

  it("sends the \"all\" sentinel when the no-filter row is picked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FilterBar
        filters={defs}
        values={{ status: "draft" }}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("combobox", { name: "Status" }));
    await user.click(await screen.findByText("All statuses"));
    expect(onChange).toHaveBeenCalledWith("status", "all");
  });

  it("does not duplicate a caller-provided \"all\" option", async () => {
    const user = userEvent.setup();
    render(<FilterBar filters={defs} values={{}} onChange={vi.fn()} />);
    await user.click(screen.getByRole("combobox", { name: "Time" }));
    // trigger shows the value + one popup item; a duplicated "all" row would
    // add a third occurrence.
    expect(screen.getAllByText("All time").length).toBe(2);
  });

  it("hides Clear filters until a non-default value is set, then resets all", async () => {
    const user = userEvent.setup();
    const onResetAll = vi.fn();
    const { rerender } = render(
      <FilterBar
        filters={defs}
        values={{ status: "all", time: undefined }}
        onChange={vi.fn()}
        onResetAll={onResetAll}
      />,
    );
    expect(screen.queryByText("Clear filters")).toBeNull();

    rerender(
      <FilterBar
        filters={defs}
        values={{ status: "draft", time: "7" }}
        onChange={vi.fn()}
        onResetAll={onResetAll}
      />,
    );
    await user.click(screen.getByText("Clear filters"));
    expect(onResetAll).toHaveBeenCalledTimes(1);
  });
});
