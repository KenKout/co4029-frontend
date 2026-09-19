import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  heartbeat: vi.fn().mockResolvedValue(undefined),
  release: vi.fn().mockResolvedValue(undefined),
  takeover: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/api/hooks/quizzes", () => ({
  useQuizAttemptHeartbeat: () => ({ mutateAsync: api.heartbeat }),
  useReleaseQuizAttemptSession: () => ({ mutateAsync: api.release }),
  useTakeoverQuizAttemptSession: () => ({ mutateAsync: api.takeover }),
}));

describe("useQuizAttemptTabGuard", () => {
  beforeEach(() => {
    api.heartbeat.mockReset().mockResolvedValue(undefined);
    api.release.mockReset().mockResolvedValue(undefined);
    api.takeover.mockReset().mockResolvedValue(undefined);
  });

  it("takes over the server lease and steals a stale browser lock", async () => {
    const request = vi
      .fn()
      .mockImplementation(
        async (
          _name: string,
          options: LockOptions,
          callback: (lock: Lock | null) => Promise<void>,
        ) => {
          if (options.ifAvailable) return callback(null);
          return callback({ name: "quiz-attempt:quiz-1", mode: "exclusive" });
        },
      );
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: { request },
    });

    const { useQuizAttemptTabGuard } = await import(
      "@/lib/quiz/use-quiz-attempt-tab-guard"
    );
    const { result, unmount } = renderHook(() =>
      useQuizAttemptTabGuard("quiz-1", "attempt-1"),
    );

    await waitFor(() => expect(result.current.blocked).toBe(true));

    let transferred!: Promise<boolean>;
    act(() => {
      transferred = result.current.requestTransfer();
    });

    await waitFor(() => expect(api.takeover).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    await expect(transferred).resolves.toBe(true);
    expect(request.mock.calls[1]?.[1]).toMatchObject({ steal: true });
    await waitFor(() => expect(result.current.transferPending).toBe(false));
    await waitFor(() => expect(result.current.blocked).toBe(false));

    unmount();
  });

  it("clears the loading state when the server takeover fails", async () => {
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: {
        request: vi
          .fn()
          .mockImplementation(
            async (
              _name: string,
              _options: LockOptions,
              callback: (lock: Lock | null) => Promise<void>,
            ) => callback(null),
          ),
      },
    });
    api.takeover.mockRejectedValueOnce(new Error("network unavailable"));

    const { useQuizAttemptTabGuard } = await import(
      "@/lib/quiz/use-quiz-attempt-tab-guard"
    );
    const { result } = renderHook(() =>
      useQuizAttemptTabGuard("quiz-1", "attempt-1"),
    );
    await waitFor(() => expect(result.current.blocked).toBe(true));

    let transferError: unknown;
    await act(async () => {
      try {
        await result.current.requestTransfer();
      } catch (error) {
        transferError = error;
      }
    });
    expect(transferError).toEqual(new Error("network unavailable"));
    await waitFor(() => expect(result.current.transferPending).toBe(false));
  });

  it("reacquires the browser lock after the previous owner closes", async () => {
    let available = false;
    const request = vi.fn().mockImplementation(
      async (
        _name: string,
        _options: LockOptions,
        callback: (lock: Lock | null) => Promise<void>,
      ) =>
        callback(
          available
            ? { name: "quiz-attempt:quiz-1", mode: "exclusive" }
            : null,
        ),
    );
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: { request },
    });

    const { useQuizAttemptTabGuard } = await import(
      "@/lib/quiz/use-quiz-attempt-tab-guard"
    );
    const { result, unmount } = renderHook(() =>
      useQuizAttemptTabGuard("quiz-1", "attempt-1"),
    );

    await waitFor(() => expect(result.current.blocked).toBe(true));
    available = true;
    await waitFor(() => expect(result.current.isOwner).toBe(true), {
      timeout: 2_000,
    });
    expect(request.mock.calls.length).toBeGreaterThanOrEqual(2);
    unmount();
  });
});
