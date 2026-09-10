import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const useMeMock = vi.fn();
const useFacultyAssignmentsMock = vi.fn();
const useOrgUnitsMock = vi.fn();

vi.mock("@/lib/api/hooks/auth", () => ({
  useMe: () => useMeMock(),
}));
vi.mock("@/lib/api/hooks/admin-organizations", () => ({
  useFacultyAssignments: () => useFacultyAssignmentsMock(),
  useOrgUnits: () => useOrgUnitsMock(),
}));

const { useFacultyFilter, UNASSIGNED_FACULTY } = await import(
  "../use-faculty-filter"
);

const ME = "user-1";
const CS = "faculty-cs";
const DS = "faculty-ds";
const UNASSIGNED_LABEL = "Unassigned";

function setup(
  assignments: { user_id: string; faculty_id: string }[],
  orgFaculties: { id: string; name: string }[] = [
    { id: CS, name: "Computer Science" },
    { id: DS, name: "Data Science" },
  ],
) {
  useMeMock.mockReturnValue({ data: { id: ME, organization_id: "org-1" } });
  useFacultyAssignmentsMock.mockReturnValue({
    data: assignments,
    isLoading: false,
  });
  useOrgUnitsMock.mockReturnValue({ data: orgFaculties });
}

/**
 * The filter no longer takes course rows: its value drives the list's
 * server-side ?faculty_id=, so deriving options from the fetched courses would
 * be circular. Options are the organization's faculties + a constant
 * "Unassigned" entry.
 */
function render() {
  return renderHook(() => useFacultyFilter(UNASSIGNED_LABEL));
}

describe("useFacultyFilter", () => {
  beforeEach(() => {
    useMeMock.mockReset();
    useFacultyAssignmentsMock.mockReset();
    useOrgUnitsMock.mockReset();
  });

  it("auto-selects my faculty when I belong to exactly one", async () => {
    setup([{ user_id: ME, faculty_id: CS }]);
    const { result } = render();
    await waitFor(() => expect(result.current.value).toBe(CS));
  });

  it("auto-selects my faculty even when it has NO courses yet", async () => {
    // The bug this fixes: an earlier version required the faculty to appear on
    // the visible courses, so a dean of an empty faculty silently fell back to
    // "All" and saw every OTHER faculty's courses. An empty table is the honest
    // answer; the dropdown shows which scope produced it.
    setup([{ user_id: ME, faculty_id: DS }]);
    const { result } = render();
    await waitFor(() => expect(result.current.value).toBe(DS));
  });

  it("stays on all when I belong to several faculties", async () => {
    // "if more than 1, show all option" — the requested rule.
    setup([
      { user_id: ME, faculty_id: CS },
      { user_id: ME, faculty_id: DS },
    ]);
    const { result } = render();
    await waitFor(() => expect(result.current.options.length).toBeGreaterThan(0));
    expect(result.current.value).toBe("all");
  });

  it("stays on all when I belong to no faculty", async () => {
    setup([]);
    const { result } = render();
    await waitFor(() => expect(result.current.options.length).toBeGreaterThan(0));
    expect(result.current.value).toBe("all");
  });

  it("ignores OTHER users' faculty assignments", async () => {
    // The endpoint returns the whole organization's assignments, so filtering by
    // user_id is what makes this "my" faculty rather than "somebody's".
    setup([{ user_id: "someone-else", faculty_id: CS }]);
    const { result } = render();
    await waitFor(() => expect(result.current.options.length).toBeGreaterThan(0));
    expect(result.current.value).toBe("all");
  });

  it("offers every faculty in the ORGANIZATION", async () => {
    // An org-scoped manager sees courses across all faculties, so the org list
    // is the honest set of things they can filter by.
    setup([]);
    const { result } = render();
    await waitFor(() => expect(result.current.options.length).toBeGreaterThan(0));
    const labels = result.current.options.map((o) => o.label);
    expect(labels).toContain("Computer Science");
    expect(labels).toContain("Data Science");
  });

  it("always offers Unassigned, appended last", async () => {
    // The filter now drives the server query, so "does any visible course lack
    // a faculty?" can't be answered from the options source any more — and it
    // doesn't need to be: picking Unassigned when nothing is unassigned simply
    // resolves to an empty list, the honest answer for that pick.
    setup([]);
    const { result } = render();
    await waitFor(() =>
      expect(
        result.current.options.some((o) => o.value === UNASSIGNED_FACULTY),
      ).toBe(true),
    );
    const opts = result.current.options;
    expect(opts[opts.length - 1].label).toBe(UNASSIGNED_LABEL);
  });

  it("sorts named faculties by label", async () => {
    setup([], [
      { id: DS, name: "Data Science" },
      { id: CS, name: "Computer Science" },
    ]);
    const { result } = render();
    await waitFor(() => expect(result.current.options.length).toBe(3));
    expect(result.current.options.map((o) => o.label)).toEqual([
      "Computer Science",
      "Data Science",
      "Unassigned",
    ]);
  });

  it("does not default while the assignments query is still loading", async () => {
    // Defaulting off an empty list mid-flight would latch "all" and never
    // correct itself once the real assignments arrived.
    useMeMock.mockReturnValue({ data: { id: ME, organization_id: "org-1" } });
    useOrgUnitsMock.mockReturnValue({ data: [{ id: CS, name: "Computer Science" }] });
    useFacultyAssignmentsMock.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { result, rerender } = renderHook(() =>
      useFacultyFilter(UNASSIGNED_LABEL),
    );
    expect(result.current.value).toBe("all");

    useFacultyAssignmentsMock.mockReturnValue({
      data: [{ user_id: ME, faculty_id: CS }],
      isLoading: false,
    });
    rerender();
    await waitFor(() => expect(result.current.value).toBe(CS));
  });

  it("keeps a manual pick across a data refetch", async () => {
    setup([{ user_id: ME, faculty_id: CS }]);
    const { result, rerender } = renderHook(() =>
      useFacultyFilter(UNASSIGNED_LABEL),
    );

    await waitFor(() => expect(result.current.value).toBe(CS));
    result.current.setValue(DS);
    await waitFor(() => expect(result.current.value).toBe(DS));

    // A refetch re-runs the effect; the ref guard must stop it re-defaulting.
    rerender();
    await waitFor(() => expect(result.current.value).toBe(DS));
  });
});
