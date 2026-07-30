import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTeacherCourseOutcomes } from "@/lib/api/hooks/courses";
import { createQueryWrapper } from "@/test/react-query-wrapper";

const apiFetchMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {},
  apiDelete: vi.fn(),
  apiFetch: apiFetchMock,
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}));

const COURSE_ID = "093f7f2b-921e-48dd-a108-11b0ef25ce07";

function outcome(id: string, code: string, depth: number, position: number) {
  return {
    id,
    code,
    depth,
    position,
    parent_id: null,
    outcome_text: `outcome ${code}`,
  };
}

describe("outcome tree ordering", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  // Regression: `position` is per-parent since the L.O.x.y hierarchy landed,
  // so branches share position values (both 1.1 and 2.1 are position 1). The
  // old flat `a.position - b.position` sort interleaved them, rendering
  // L.O.2.1 between L.O.1.1 and L.O.1.2 as if the child had jumped parents.
  it("keeps children under their own parent when positions collide", async () => {
    apiFetchMock.mockResolvedValue([
      outcome("a", "1", 0, 1),
      outcome("b", "1.1", 1, 1),
      outcome("c", "1.2", 1, 2),
      outcome("d", "2", 0, 2),
      outcome("e", "2.1", 1, 1),
      outcome("f", "2.2", 1, 2),
      outcome("g", "3", 0, 3),
    ]);

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useTeacherCourseOutcomes(COURSE_ID), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.map((o) => o.code)).toEqual([
      "1",
      "1.1",
      "1.2",
      "2",
      "2.1",
      "2.2",
      "3",
    ]);
  });

  it("sorts dotted codes numerically, not lexicographically", async () => {
    apiFetchMock.mockResolvedValue([
      outcome("a", "1.10", 1, 10),
      outcome("b", "1.2", 1, 2),
      outcome("c", "1", 0, 1),
    ]);

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useTeacherCourseOutcomes(COURSE_ID), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.map((o) => o.code)).toEqual([
      "1",
      "1.2",
      "1.10",
    ]);
  });

  it("falls back to position when the server sends no code", async () => {
    apiFetchMock.mockResolvedValue([
      { ...outcome("b", "", 0, 2), code: null },
      { ...outcome("a", "", 0, 1), code: null },
    ]);

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => useTeacherCourseOutcomes(COURSE_ID), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.map((o) => o.id)).toEqual(["a", "b"]);
  });
});
