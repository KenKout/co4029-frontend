import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { TFunction } from "i18next";

const mocks = vi.hoisted(() => ({
  publishMutate: vi.fn(),
  archiveMutate: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}));

let coursesData: unknown[] = [];

vi.mock("@/lib/api/hooks/career-paths", () => ({
  usePublishCareerPath: () => ({ mutate: mocks.publishMutate, isPending: false }),
  useArchiveCareerPath: () => ({ mutate: mocks.archiveMutate, isPending: false }),
  useCareerPathCourses: () => ({ data: coursesData }),
}));
vi.mock("@/lib/api/client", () => ({
  apiPost: mocks.apiPost,
  apiDelete: mocks.apiDelete,
}));

import { usePathActions } from "../use-path-actions";

const t = ((k: string, opts?: Record<string, unknown>) =>
  `${k}${opts ? JSON.stringify(opts) : ""}`) as unknown as TFunction;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

describe("usePathActions publish gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    coursesData = [];
    mocks.publishMutate.mockImplementation(
      (_: unknown, opts: { onSuccess?: () => void }) => opts.onSuccess?.(),
    );
  });

  it("publishes directly when every course is published", () => {
    coursesData = [
      { course_id: "c1", course_status: "published" },
      { course_id: "c2", course_status: "published" },
    ];
    const { result } = renderHook(() => usePathActions("p", t), { wrapper });
    act(() => result.current.handlePublish());
    expect(mocks.publishMutate).toHaveBeenCalledTimes(1);
    expect(result.current.publishDecision.draftCourses).toBeNull();
  });

  it("opens the decision dialog instead of publishing when draft courses exist", () => {
    coursesData = [
      { course_id: "c1", course_status: "published" },
      { course_id: "c2", course_status: "draft" },
    ];
    const { result } = renderHook(() => usePathActions("p", t), { wrapper });
    act(() => result.current.handlePublish());
    expect(mocks.publishMutate).not.toHaveBeenCalled();
    expect(result.current.publishDecision.draftCourses).toHaveLength(1);
    expect(result.current.publishDecision.draftCourses![0].course_id).toBe(
      "c2",
    );
  });

  it("publish-courses action publishes each draft then the path", async () => {
    coursesData = [
      { course_id: "c1", course_status: "draft" },
      { course_id: "c2", course_status: "draft" },
    ];
    mocks.apiPost.mockResolvedValue({ status: "published" });
    const { result } = renderHook(() => usePathActions("p", t), { wrapper });
    act(() => result.current.handlePublish());
    expect(result.current.publishDecision.draftCourses).toHaveLength(2);
    await act(async () => {
      await result.current.publishDecision.onPublishCourses();
    });
    expect(mocks.apiPost).toHaveBeenCalledTimes(2);
    expect(mocks.apiPost.mock.calls[0][0]).toBe("/teacher/courses/c1/publish");
    expect(mocks.apiPost.mock.calls[1][0]).toBe("/teacher/courses/c2/publish");
    expect(mocks.publishMutate).toHaveBeenCalledTimes(1);
    expect(result.current.publishDecision.draftCourses).toBeNull();
  });

  it("remove action deletes each draft from the path then publishes", async () => {
    coursesData = [{ course_id: "c1", course_status: "draft" }];
    mocks.apiDelete.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePathActions("p", t), { wrapper });
    act(() => result.current.handlePublish());
    await act(async () => {
      await result.current.publishDecision.onRemoveCourses();
    });
    expect(mocks.apiDelete).toHaveBeenCalledTimes(1);
    expect(mocks.apiDelete.mock.calls[0][0]).toBe(
      "/management/career-paths/p/courses/c1",
    );
    expect(mocks.publishMutate).toHaveBeenCalledTimes(1);
  });

  it("stops and reports when a course publish fails (no gradeable unit)", async () => {
    coursesData = [
      { course_id: "c1", course_title: "Data Mining", course_status: "draft" },
    ];
    mocks.apiPost.mockRejectedValue(new Error("no gradeable unit"));
    const { result } = renderHook(() => usePathActions("p", t), { wrapper });
    act(() => result.current.handlePublish());
    await act(async () => {
      await result.current.publishDecision.onPublishCourses();
    });
    expect(mocks.publishMutate).not.toHaveBeenCalled();
    // The dialog stays open so the manager can switch to "remove".
    expect(result.current.publishDecision.draftCourses).toHaveLength(1);
    expect(result.current.publishDecision.dialogAction).toBeNull();
  });
});
