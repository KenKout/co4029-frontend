import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AGENT_JOIN_DEADLINE_MS } from "../agent-voice-presentation";
import { useAgentJoinWatchdog } from "../use-agent-join-watchdog";

describe("useAgentJoinWatchdog", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays false while the agent joins within the deadline", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ expected, agentPresent }) =>
        useAgentJoinWatchdog({ expected, agentPresent }),
      { initialProps: { expected: true, agentPresent: false } },
    );

    act(() => {
      vi.advanceTimersByTime(AGENT_JOIN_DEADLINE_MS - 1_000);
    });
    expect(result.current).toBe(false);

    // The agent arrives just before the deadline: no timeout, ever.
    rerender({ expected: true, agentPresent: true });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current).toBe(false);
  });

  it("flips to true once the deadline passes with no agent", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useAgentJoinWatchdog({ expected: true, agentPresent: false }),
    );

    act(() => {
      vi.advanceTimersByTime(AGENT_JOIN_DEADLINE_MS);
    });

    expect(result.current).toBe(true);
  });

  it("latches: no flapping after the deadline, even if presence wiggles", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ agentPresent }) =>
        useAgentJoinWatchdog({ expected: true, agentPresent }),
      { initialProps: { agentPresent: false } },
    );

    act(() => {
      vi.advanceTimersByTime(AGENT_JOIN_DEADLINE_MS);
    });
    expect(result.current).toBe(true);

    // A late participant is NOT retroactively the original agent.
    rerender({ agentPresent: true });
    expect(result.current).toBe(true);
    rerender({ agentPresent: false });
    expect(result.current).toBe(true);
  });

  it("does not arm while no agent is expected", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useAgentJoinWatchdog({ expected: false, agentPresent: false }),
    );

    act(() => {
      vi.advanceTimersByTime(120_000);
    });

    expect(result.current).toBe(false);
  });

  it("re-arms when the expectation restarts after a session switch", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ expected, agentPresent }) =>
        useAgentJoinWatchdog({ expected, agentPresent }),
      {
        initialProps: { expected: true, agentPresent: false },
      },
    );

    act(() => {
      vi.advanceTimersByTime(AGENT_JOIN_DEADLINE_MS);
    });
    expect(result.current).toBe(true);

    // New session: expectation resets, the latch releases, and the timer arms
    // for the new agent.
    rerender({ expected: false, agentPresent: false });
    expect(result.current).toBe(false);
    rerender({ expected: true, agentPresent: false });
    act(() => {
      vi.advanceTimersByTime(AGENT_JOIN_DEADLINE_MS);
    });
    expect(result.current).toBe(true);
  });
});
