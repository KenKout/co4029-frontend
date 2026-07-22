import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDeleteInterviewConfig } from "@/lib/api/hooks/interviews";
import { queryKeys } from "@/lib/api/query-keys";
import { createQueryWrapper } from "@/test/react-query-wrapper";

const apiDeleteMock = vi.hoisted(() => vi.fn());

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { resolvedLanguage: "en", language: "en" },
  }),
}));

vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {},
  apiDelete: apiDeleteMock,
  apiFetch: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}));

const configId = "00000000-0000-0000-0000-0000000000c1";
const courseId = "00000000-0000-0000-0000-0000000000a1";

describe("useDeleteInterviewConfig cache invalidation", () => {
  beforeEach(() => {
    apiDeleteMock.mockReset();
    apiDeleteMock.mockResolvedValue(undefined);
  });

  it("invalidates both course content lists so the deleted interview disappears", async () => {
    const { client, Wrapper } = createQueryWrapper();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    const removeSpy = vi.spyOn(client, "removeQueries");

    const { result } = renderHook(
      () => useDeleteInterviewConfig(configId, courseId),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(apiDeleteMock).toHaveBeenCalledWith(
      `/teacher/interview-configs/${configId}`,
    );
    // The stale authoring detail is dropped…
    expect(removeSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.interviews.configAuthoring(configId),
    });
    // …and BOTH course content projections are invalidated so the module-item
    // list re-fetches without the deleted interview.
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.courses.content(courseId),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["teacher", "courses", courseId, "content"],
    });
  });

  it("still deletes (and drops the detail) when no courseId is provided", async () => {
    const { client, Wrapper } = createQueryWrapper();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    const removeSpy = vi.spyOn(client, "removeQueries");

    const { result } = renderHook(() => useDeleteInterviewConfig(configId), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(removeSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.interviews.configAuthoring(configId),
    });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
