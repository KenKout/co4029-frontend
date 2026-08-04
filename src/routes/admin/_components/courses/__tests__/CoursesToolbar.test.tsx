import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CoursesToolbar } from "../CoursesToolbar";
import type { AdminCoursesController } from "../use-admin-courses";

/**
 * Stateful harness — the toolbar is presentational and takes everything it
 * needs as props, so no query client / router / permissions stand-up. The
 * controller's search/status are REAL state here, so a keystroke or a pick
 * flows back through the controlled props the same way useServerTable would
 * (a mock that never updates would show the input snapping back to empty).
 */
function Harness() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );
  const c = {
    t: (k: string) => k,
    table: { search, setSearch },
    statusFilter,
    setStatusFilter,
    includeDeleted: true,
    setIncludeDeleted: vi.fn(),
  } as unknown as AdminCoursesController;
  return <CoursesToolbar c={c} />;
}

describe("admin courses toolbar", () => {
  it("renders the shared search box, the status filter and the include-deleted toggle", () => {
    render(<Harness />);
    // Search comes from the shared DataTableToolbar/SearchInput, not a
    // hand-rolled input.
    screen.getByPlaceholderText("admin.courses_list.search_placeholder");
    // Status filter is the toolbar's inline filter chip, labelled by its
    // FilterDef label.
    screen.getByRole("combobox", {
      name: "admin.courses_list.filter_status",
    });
    screen.getByRole("checkbox");
    screen.getByText("admin.courses_list.include_deleted");
  });

  it("keeps search typing in the input (controlled round-trip through table.search)", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByPlaceholderText(
      "admin.courses_list.search_placeholder",
    );
    await user.type(input, "sql");
    // If the value prop were not wired back, the input would snap to empty
    // after each keystroke and never hold the full phrase.
    expect(input).toHaveValue("sql");
  });

  it("reflects the selected status on the filter chip (round-trip through statusFilter)", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(
      screen.getByRole("combobox", {
        name: "admin.courses_list.filter_status",
      }),
    );
    await user.click(
      await screen.findByText("admin.courses_list.row_status.draft"),
    );
    // The trigger now shows the picked option instead of the filter label.
    expect(
      screen.getByRole("combobox", {
        name: "admin.courses_list.filter_status",
      }),
    ).toHaveTextContent("admin.courses_list.row_status.draft");
  });

  it("propagates include-deleted toggling", async () => {
    const user = userEvent.setup();
    const setIncludeDeleted = vi.fn();
    const c = {
      t: (k: string) => k,
      table: { search: "", setSearch: vi.fn() },
      statusFilter: undefined,
      setStatusFilter: vi.fn(),
      includeDeleted: true,
      setIncludeDeleted,
    } as unknown as AdminCoursesController;
    render(<CoursesToolbar c={c} />);
    await user.click(screen.getByRole("checkbox"));
    expect(setIncludeDeleted).toHaveBeenCalledWith(false);
  });
});
