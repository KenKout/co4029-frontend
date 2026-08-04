import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { CoursesTable } from "../CoursesTable";
import type { AdminCoursesController } from "../use-admin-courses";

/** Controller stub — the empty-state logic only reads `table.search` and
 *  `statusFilter`, and the table renders no rows/columns in this harness. */
function makeController({
  search = "",
  statusFilter,
}: { search?: string; statusFilter?: string } = {}) {
  return {
    t: (k: string) => k,
    navigate: vi.fn(),
    table: {
      rows: [],
      total: 0,
      isLoading: false,
      search,
      setSearch: vi.fn(),
      page: 0,
      setPage: vi.fn(),
      pageSize: 25,
      setPageSize: vi.fn(),
      sort: null,
      setSort: vi.fn(),
    },
    statusFilter,
    columns: [],
  } as unknown as AdminCoursesController;
}

describe("admin courses table empty state", () => {
  it("says the system is empty when nothing narrows the list", () => {
    render(<CoursesTable c={makeController()} />);
    expect(screen.getByText("admin.courses_list.empty_title")).toBeInTheDocument();
  });

  it("says 'no matches' when a status filter is active (even with zero rows)", () => {
    // Regression: the old condition only checked `search`, so picking a
    // status with no rows (e.g. archived — none exist in the DB) showed
    // "No courses yet" as if the system were empty. The users table already
    // included its filters; mirror it.
    render(<CoursesTable c={makeController({ statusFilter: "archived" })} />);
    expect(screen.getByText("admin.courses_list.empty_search")).toBeInTheDocument();
    expect(
      screen.queryByText("admin.courses_list.empty_title"),
    ).toBeNull();
  });

  it("says 'no matches' when a search is active", () => {
    render(<CoursesTable c={makeController({ search: "zzz" })} />);
    expect(screen.getByText("admin.courses_list.empty_search")).toBeInTheDocument();
  });
});
