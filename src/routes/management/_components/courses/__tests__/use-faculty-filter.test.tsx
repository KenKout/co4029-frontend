import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const useMeMock = vi.fn();
const useFacultyAssignmentsMock = vi.fn();

vi.mock("@/lib/api/hooks/auth", () => ({
  useMe: () => useMeMock(),
}));
vi.mock("@/lib/api/hooks/admin-organizations", () => ({
  useFacultyAssignments: () => useFacultyAssignmentsMock(),
}));

const { useFacultyFilter } = await import("../use-faculty-filter");

const ME = "user-1";
const CS = "faculty-cs";
const DS = "faculty-ds";

/** Minimal course rows — only the two fields the hook reads. */
function course(id: string, facultyId: string | null, facultyName: string | null) {
  return { id, faculty_id: facultyId, faculty_name: facultyName } as never;
}

function setup(assignments: { user_id: string; faculty_id: string }[]) {
  useMeMock.mockReturnValue({ data: { id: ME, organization_id: "org-1" } });
  useFacultyAssignmentsMock.mockReturnValue({ data: assignments });
}

describe("useFacultyFilter", () => {
  beforeEach(() => {
    useMeMock.mockReset();
    useFacultyAssignmentsMock.mockReset();
  });

  it("auto-selects my faculty when I belong to exactly one", async () => {
    setup([{ user_id: ME, faculty_id: CS }]);
    const { result } = renderHook(() =>
      useFacultyFilter([
        course("c1", CS, "Computer Science"),
        course("c2", DS, "Data Science"),
      ]),
    );
    await waitFor(() => expect(result.current.value).toBe(CS));
  });

  it("stays on all when I belong to several faculties", async () => {
    // "if more than 1, show all option" — the requested rule.
    setup([
      { user_id: ME, faculty_id: CS },
      { user_id: ME, faculty_id: DS },
    ]);
    const { result } = renderHook(() =>
      useFacultyFilter([
        course("c1", CS, "Computer Science"),
        course("c2", DS, "Data Science"),
      ]),
    );
    await waitFor(() => expect(result.current.options).toHaveLength(2));
    expect(result.current.value).toBe("all");
  });

  it("stays on all when I belong to no faculty", async () => {
    setup([]);
    const { result } = renderHook(() =>
      useFacultyFilter([course("c1", CS, "Computer Science")]),
    );
    await waitFor(() => expect(result.current.options).toHaveLength(1));
    expect(result.current.value).toBe("all");
  });

  it("ignores OTHER users' faculty assignments", async () => {
    // The endpoint returns the whole organization's assignments, so filtering by
    // user_id is what makes this "my" faculty rather than "somebody's".
    setup([{ user_id: "someone-else", faculty_id: CS }]);
    const { result } = renderHook(() =>
      useFacultyFilter([course("c1", CS, "Computer Science")]),
    );
    await waitFor(() => expect(result.current.options).toHaveLength(1));
    expect(result.current.value).toBe("all");
  });

  it("does not auto-select a faculty absent from the page", async () => {
    // Defaulting to a faculty with no courses here would open on an empty table
    // with no visible reason.
    setup([{ user_id: ME, faculty_id: DS }]);
    const { result } = renderHook(() =>
      useFacultyFilter([course("c1", CS, "Computer Science")]),
    );
    await waitFor(() => expect(result.current.options).toHaveLength(1));
    expect(result.current.value).toBe("all");
  });

  it("offers only faculties present on the page, label-sorted", async () => {
    setup([]);
    const { result } = renderHook(() =>
      useFacultyFilter([
        course("c1", DS, "Data Science"),
        course("c2", CS, "Computer Science"),
        course("c3", null, null),
        course("c4", CS, "Computer Science"),
      ]),
    );
    await waitFor(() => expect(result.current.options).toHaveLength(2));
    expect(result.current.options.map((o) => o.label)).toEqual([
      "Computer Science",
      "Data Science",
    ]);
  });

  it("has no options when no course carries a faculty", async () => {
    // Today's real state: the page hides the filter entirely rather than showing
    // a dropdown whose only entry is "All".
    setup([{ user_id: ME, faculty_id: CS }]);
    const { result } = renderHook(() =>
      useFacultyFilter([course("c1", null, null), course("c2", null, null)]),
    );
    await waitFor(() => expect(result.current.options).toEqual([]));
    expect(result.current.value).toBe("all");
  });

  it("keeps a manual pick across a data refetch", async () => {
    setup([{ user_id: ME, faculty_id: CS }]);
    const rows = [course("c1", CS, "Computer Science"), course("c2", DS, "Data Science")];
    const { result, rerender } = renderHook(() => useFacultyFilter(rows));

    await waitFor(() => expect(result.current.value).toBe(CS));
    result.current.setValue(DS);
    await waitFor(() => expect(result.current.value).toBe(DS));

    // A refetch re-runs the effect; the ref guard must stop it re-defaulting.
    rerender();
    await waitFor(() => expect(result.current.value).toBe(DS));
  });
});
