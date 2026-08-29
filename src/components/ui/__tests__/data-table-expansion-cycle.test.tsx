import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

interface Row {
  id: string;
  name: string;
}

const COLUMNS: DataTableColumn<Row>[] = [
  { id: "name", header: "Name", cell: (r) => r.name },
];

/**
 * Regression: a `getSubRows` that returns a child for EVERY row (including
 * its own children) used to recurse forever once a row was expanded — the
 * shared table now guards cycles in the flatten walk, so a malformed client
 * cannot take the dashboard down with a stack overflow.
 */
describe("DataTable expansion cycle guard", () => {
  it("does not blow the stack when getSubRows is cyclic", () => {
    const rows: Row[] = [{ id: "a", name: "Course A" }];
    // Every row claims one child that carries the SAME id (the classic
    // mistake: getRowId collides between a row and its detail row).
    const getRowId = (r: Row) => r.id;
    const getSubRows = (r: Row): Row[] => [{ id: r.id, name: `${r.name} detail` }];

    const { container } = render(
      <DataTable
        columns={COLUMNS}
        data={rows}
        getRowId={getRowId}
        getSubRows={getSubRows}
      />,
    );

    // Expand Course A — this used to recurse until RangeError.
    const expandButton = screen.getAllByRole("button").find((b) =>
      b.getAttribute("aria-label")?.includes("Expand"),
    );
    expect(expandButton).toBeTruthy();
    expect(() => fireEvent.click(expandButton!)).not.toThrow();

    // The cycle is cut after one level: exactly one detail row renders.
    expect(container.textContent).toContain("Course A detail");
    expect(container.textContent).not.toContain("Course A detail detail");
  });
});