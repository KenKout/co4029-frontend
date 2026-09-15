import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useQuizCamera } from "@/lib/quiz/use-quiz-camera";

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

describe("useQuizCamera", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requires an active local video track before succeeding", async () => {
    const track = fakeTrack();
    const mediaDevices = installMediaDevices(fakeStream(track));
    const { result } = renderHook(() => useQuizCamera(true, true));

    await act(async () => {
      expect(await result.current.ensureActive()).toBe(true);
    });

    expect(result.current.active).toBe(true);
    expect(result.current.stream).not.toBeNull();
    expect(mediaDevices.getUserMedia).toHaveBeenCalledWith({
      video: true,
      audio: false,
    });
  });

  it("stops every media track when the quiz lifecycle ends", async () => {
    const track = fakeTrack();
    installMediaDevices(fakeStream(track));
    const { result, unmount } = renderHook(() => useQuizCamera(true, true));

    await act(async () => {
      await result.current.ensureActive();
    });
    unmount();

    expect(track.stop).toHaveBeenCalledTimes(1);
  });
});
