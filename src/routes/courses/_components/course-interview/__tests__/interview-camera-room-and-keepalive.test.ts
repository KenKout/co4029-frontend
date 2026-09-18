import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { interviewRoomProps } from "../agent-voice-presentation";
import { useInterviewCameraGate } from "../use-interview-camera-gate";

/**
 * The interview camera gate as seen by the ROOM and the LIVE SESSION.
 *
 * `cameraGranted` is a hold on every room capability exactly like
 * `fullscreenGranted`: while the required camera is not live, the client
 * disconnects, stops warming/prefetching, publishes no mic and dispatches no
 * agent. Omitting the flag keeps today's behaviour (not a gate) so the two
 * call sites migrate explicitly.
 *
 * The keepalive guard is the mid-session half: a camera that dies mid-interview
 * flips the controller inactive after the debounce window, which (through the
 * room props) drops the room rather than letting the session continue unseen.
 */

const ROOM_PROPS_BASE = {
  sessionId: "s-1",
  phase: "questioning" as const,
  onboardingStage: "completed",
  pendingFirstQuestion: null as unknown,
  micOn: true,
  finishResult: undefined as unknown,
  closingReason: null as "natural" | "ended_early" | "timed_out" | null,
  fullscreenGranted: true,
};

describe("the camera gate zeroes every room capability", () => {
  it("questioning: no room, no mic, no agent while the camera is not live", () => {
    const props = interviewRoomProps({ ...ROOM_PROPS_BASE, cameraGranted: false });
    expect(props).toEqual({
      active: false,
      prefetch: false,
      warm: false,
      agentWanted: false,
      audio: false,
    });
  });

  it("onboarding: no warm room either — the overlap must not open", () => {
    const props = interviewRoomProps({
      ...ROOM_PROPS_BASE,
      onboardingStage: "readiness",
      cameraGranted: false,
    });
    expect(props.warm).toBe(false);
    expect(props.active).toBe(false);
  });

  it("camera granted behaves exactly like today (control)", () => {
    const props = interviewRoomProps({ ...ROOM_PROPS_BASE, cameraGranted: true });
    expect(props.active).toBe(true);
    expect(props.prefetch).toBe(true);
    expect(props.agentWanted).toBe(true);
    expect(props.audio).toBe(true);
  });

  it("omitting the flag is NOT a gate (call sites opt in explicitly)", () => {
    const props = interviewRoomProps({ ...ROOM_PROPS_BASE });
    expect(props.active).toBe(true);
  });
});

function fakeTrack() {
  const listeners = new Map<string, Set<() => void>>();
  return {
    readyState: "live",
    muted: false,
    stop: vi.fn(),
    addEventListener: (name: string, cb: () => void) => {
      const callbacks = listeners.get(name) ?? new Set();
      callbacks.add(cb);
      listeners.set(name, callbacks);
    },
    removeEventListener: (name: string, cb: () => void) => {
      listeners.get(name)?.delete(cb);
    },
    fire(name: string) {
      listeners.get(name)?.forEach((cb) => cb());
    },
  };
}

function fakeStream(track: ReturnType<typeof fakeTrack>) {
  return {
    getVideoTracks: () => [track],
    getTracks: () => [track],
  } as unknown as MediaStream;
}

function installMediaDevices(stream: MediaStream) {
  const mediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue(stream),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: mediaDevices,
  });
  return mediaDevices;
}

describe("useInterviewCameraGate (interview lifecycle over the shared hook)", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("preflights before start: ensureActive resolves false when denied", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockRejectedValue(
          Object.assign(new DOMException("no", "NotAllowedError"), {}),
        ),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
    const { result } = renderHook(() => useInterviewCameraGate(true));
    let ok = true;
    await act(async () => {
      ok = await result.current.ensureActive();
    });
    expect(ok).toBe(false);
    expect(result.current.error).toBe("permission-denied");
  });

  it("a camera dying mid-interview goes inactive after the debounce", async () => {
    vi.useFakeTimers();
    const track = fakeTrack();
    installMediaDevices(fakeStream(track));
    const { result } = renderHook(() => useInterviewCameraGate(true));
    await act(async () => {
      expect(await result.current.ensureActive()).toBe(true);
    });
    expect(result.current.active).toBe(true);

    act(() => {
      track.readyState = "ended";
      track.fire("ended");
    });
    // Inside the debounce window it is NOT yet inactive (a 1s USB hiccup must
    // not kick a candidate out of a graded session).
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.active).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(result.current.active).toBe(false);
    expect(result.current.error).toBe("camera-unavailable");
  });

  it("a track that recovers inside the window never goes inactive", async () => {
    vi.useFakeTimers();
    const track = fakeTrack();
    installMediaDevices(fakeStream(track));
    const { result } = renderHook(() => useInterviewCameraGate(true));
    await act(async () => {
      await result.current.ensureActive();
    });

    act(() => {
      track.muted = true;
      track.fire("mute");
    });
    act(() => {
      vi.advanceTimersByTime(3999);
      track.muted = false;
      track.fire("unmute");
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.active).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("stops every media track when the interview lifecycle ends", async () => {
    const track = fakeTrack();
    installMediaDevices(fakeStream(track));
    const { result, unmount } = renderHook(() => useInterviewCameraGate(true));
    await act(async () => {
      await result.current.ensureActive();
    });
    unmount();
    expect(track.stop).toHaveBeenCalledTimes(1);
  });

  it("clearError wipes a stale denial so the next start can retry", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi
          .fn()
          .mockRejectedValueOnce(new DOMException("no", "NotAllowedError"))
          .mockResolvedValueOnce(fakeStream(fakeTrack()) as unknown as MediaStream),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
    const { result } = renderHook(() => useInterviewCameraGate(true));
    await act(async () => {
      expect(await result.current.ensureActive()).toBe(false);
    });
    expect(result.current.error).toBe("permission-denied");

    act(() => {
      result.current.clearError();
    });
    expect(result.current.error).toBeNull();

    await act(async () => {
      expect(await result.current.ensureActive()).toBe(true);
    });
    expect(result.current.active).toBe(true);
  });
});
