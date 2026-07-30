import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePendingQuestionDeletes } from "@/lib/api/hooks/quizzes";
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

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("@/i18n", () => ({ default: { t: (k: string) => k } }));

const quizId = "00000000-0000-0000-0000-0000000000q1";
const WINDOW_MS = 5000;

/**
 * Regression: deleting questions made them vanish, then REAPPEAR after the 5s
 * countdown, then vanish again.
 *
 * The commit path cleared the staged `pending` map before the DELETE requests
 * resolved. In that gap the rows were no longer hidden locally but the server
 * still returned them, so they flashed back into the list until the invalidated
 * query refetched.
 *
 * `pendingIds` must therefore stay populated continuously — from the click,
 * through the countdown, through the in-flight DELETE + refetch — and only
 * release once fresh data has landed.
 */
describe("usePendingQuestionDeletes — no reappear flicker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    apiDeleteMock.mockReset();
    apiDeleteMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps ids hidden across the countdown AND the in-flight delete", async () => {
    // A DELETE we control, so we can observe the exact window that used to
    // unhide the rows.
    // TWO deletes fire, so collect EVERY resolver -- keeping only the last
    // would leave one promise pending forever and the ids never released.
    const resolvers: Array<() => void> = [];
    apiDeleteMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvers.push(resolve);
        }),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => usePendingQuestionDeletes(quizId), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.queueDelete({ id: "q1", label: "one" });
      result.current.queueDelete({ id: "q2", label: "two" });
    });

    // Staged: hidden immediately, undo banner showing.
    expect(result.current.pendingIds).toEqual(new Set(["q1", "q2"]));
    expect(result.current.comboCount).toBe(2);

    // Countdown expires -> commit fires. This is the moment that used to
    // unhide the rows while the DELETE was still in flight.
    await act(async () => {
      vi.advanceTimersByTime(WINDOW_MS + 50);
    });

    expect(apiDeleteMock).toHaveBeenCalledTimes(2);
    // THE BUG: this was `new Set()` here, so both rows reappeared.
    expect(result.current.pendingIds).toEqual(new Set(["q1", "q2"]));
    // The undo banner is gone though — the delete can no longer be undone.
    expect(result.current.comboCount).toBe(0);

    // Server responds; only now may the ids be released.
    await act(async () => {
      for (const r of resolvers) r();
      // Flush the promise chain: DELETE resolve -> invalidate -> finally.
      for (let i = 0; i < 10; i += 1) await Promise.resolve();
      await vi.runAllTimersAsync();
      for (let i = 0; i < 10; i += 1) await Promise.resolve();
    });

    expect(result.current.pendingIds).toEqual(new Set());
  });

  it("undo cancels without ever calling DELETE", async () => {
    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => usePendingQuestionDeletes(quizId), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.queueDelete({ id: "q1", label: "one" });
    });
    expect(result.current.pendingIds).toEqual(new Set(["q1"]));

    act(() => {
      result.current.undo();
    });

    // Row is visible again straight away, and nothing was sent.
    expect(result.current.pendingIds).toEqual(new Set());
    expect(result.current.comboCount).toBe(0);

    await act(async () => {
      vi.advanceTimersByTime(WINDOW_MS + 50);
    });
    expect(apiDeleteMock).not.toHaveBeenCalled();
  });

  it("a failed delete releases the id so the row comes back", async () => {
    apiDeleteMock.mockRejectedValue(new Error("boom"));

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => usePendingQuestionDeletes(quizId), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.queueDelete({ id: "q1", label: "one" });
    });

    await act(async () => {
      vi.advanceTimersByTime(WINDOW_MS + 50);
      await vi.runAllTimersAsync();
    });

    // The question still exists server-side, so it must not stay hidden.
    expect(result.current.pendingIds).toEqual(new Set());
  });

  it("flushNow commits immediately and still holds ids until done", async () => {
    let resolveDelete: (() => void) | undefined;
    apiDeleteMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        }),
    );

    const { Wrapper } = createQueryWrapper();
    const { result } = renderHook(() => usePendingQuestionDeletes(quizId), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.queueDelete({ id: "q1", label: "one" });
    });

    await act(async () => {
      result.current.flushNow();
    });

    expect(apiDeleteMock).toHaveBeenCalledTimes(1);
    // Hidden even though the countdown never finished.
    expect(result.current.pendingIds).toEqual(new Set(["q1"]));
    expect(result.current.comboCount).toBe(0);

    await act(async () => {
      resolveDelete?.();
      await vi.runAllTimersAsync();
    });

    expect(result.current.pendingIds).toEqual(new Set());
  });
});
