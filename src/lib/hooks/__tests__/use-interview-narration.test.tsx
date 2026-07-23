import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useInterviewNarration } from "../use-interview-narration";

const mocks = vi.hoisted(() => ({
  apiPostBlob: vi.fn(),
  browserSpeak: vi.fn(),
  browserCancel: vi.fn(),
  audioPlay: vi.fn(),
  audioPause: vi.fn(),
  audioLoad: vi.fn(),
  createObjectURL: vi.fn(),
  revokeObjectURL: vi.fn(),
  contextResume: vi.fn(),
  contextClose: vi.fn(),
  sourceStart: vi.fn(),
  sourceStop: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  apiPostBlob: mocks.apiPostBlob,
  ApiError: class ApiError extends Error {
    status = 500;
  },
}));

vi.mock("../use-speech-synthesis", () => ({
  useSpeechSynthesis: () => ({
    supported: true,
    speak: mocks.browserSpeak,
    cancel: mocks.browserCancel,
  }),
}));

class MockAudio {
  static latest: MockAudio | null = null;
  static instances: MockAudio[] = [];
  static nextReadyState = 4;

  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  preload = "";
  loop = false;
  currentTime = 12;
  duration = 2.4;
  readyState: number;
  private listeners = new Map<string, Set<() => void>>();

  constructor(public readonly src: string) {
    this.readyState = MockAudio.nextReadyState;
    MockAudio.latest = this;
    MockAudio.instances.push(this);
  }

  play = mocks.audioPlay;
  pause = mocks.audioPause;
  load = mocks.audioLoad;

  setAttribute() {}

  addEventListener(type: string, listener: () => void) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: () => void) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string) {
    this.listeners.get(type)?.forEach((listener) => listener());
  }
}

class MockAudioContext {
  static latest: MockAudioContext | null = null;

  currentTime = 0;
  destination = {} as AudioDestinationNode;
  decoded = {
    numberOfChannels: 1,
    length: 4,
    sampleRate: 1_000,
    duration: 0.004,
    getChannelData: () => new Float32Array([0.1, 0.2, 0.3, 0.4]),
  };
  protectedChannel: Float32Array | null = null;
  source = {
    buffer: null as AudioBuffer | null,
    connect: vi.fn(),
    start: mocks.sourceStart,
    stop: mocks.sourceStop,
    onended: null as (() => void) | null,
  };

  constructor() {
    MockAudioContext.latest = this;
  }

  decodeAudioData = vi.fn().mockResolvedValue(this.decoded);
  createBuffer = vi.fn((_channels: number, length: number) => {
    this.protectedChannel = new Float32Array(length);
    return {
      getChannelData: () => this.protectedChannel,
    } as unknown as AudioBuffer;
  });
  createBufferSource = vi.fn(
    () => this.source as unknown as AudioBufferSourceNode,
  );
  resume = mocks.contextResume;
  close = mocks.contextClose;
}

describe("useInterviewNarration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockAudio.latest = null;
    MockAudio.instances = [];
    MockAudio.nextReadyState = 4;
    MockAudioContext.latest = null;
    mocks.audioPlay.mockResolvedValue(undefined);
    mocks.contextResume.mockResolvedValue(undefined);
    mocks.contextClose.mockResolvedValue(undefined);
    mocks.createObjectURL.mockReturnValue("blob:interview-audio");
    vi.stubGlobal("Audio", MockAudio);
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window, "webkitAudioContext", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: mocks.createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: mocks.revokeObjectURL,
    });
  });

  it("does not cancel a pending first utterance when the parent rerenders", async () => {
    let resolveNarration!: (blob: Blob) => void;
    mocks.apiPostBlob.mockReturnValue(
      new Promise<Blob>((resolve) => {
        resolveNarration = resolve;
      }),
    );

    const { result, rerender } = renderHook(() =>
      useInterviewNarration({
        sessionId: "session-1",
        persona: "neutral",
        lang: "en-US",
      }),
    );
    const firstApi = result.current;

    let narrationReady!: ReturnType<typeof result.current.narrate>;
    act(() => {
      narrationReady = result.current.narrate("Welcome to the interview");
    });
    expect(mocks.browserCancel).toHaveBeenCalledTimes(1);

    rerender();

    expect(result.current).toBe(firstApi);
    expect(mocks.browserCancel).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveNarration(new Blob(["audio"], { type: "audio/mpeg" }));
      await narrationReady.started;
    });

    expect(mocks.createObjectURL).toHaveBeenCalledTimes(2);
    expect(mocks.audioLoad).toHaveBeenCalledTimes(1);
    expect(mocks.audioPlay).toHaveBeenCalledTimes(2);
    expect(MockAudio.instances[0].loop).toBe(true);
    await waitFor(() => expect(mocks.audioPause).toHaveBeenCalled());
    expect(MockAudio.latest?.currentTime).toBe(0);
    expect(await narrationReady.durationMs).toBe(2_400);
    expect(mocks.browserSpeak).not.toHaveBeenCalled();
  });

  it("buffers narration before starting at the beginning of the audio", async () => {
    MockAudio.nextReadyState = 0;
    mocks.apiPostBlob.mockResolvedValue(
      new Blob(["audio"], { type: "audio/mpeg" }),
    );

    const { result } = renderHook(() =>
      useInterviewNarration({
        sessionId: "session-1",
        persona: "neutral",
        lang: "en-US",
      }),
    );

    let presentation!: ReturnType<typeof result.current.narrate>;
    act(() => {
      presentation = result.current.narrate("Thank you and goodbye");
    });

    await waitFor(() => expect(MockAudio.instances).toHaveLength(2));
    expect(mocks.audioLoad).toHaveBeenCalledTimes(1);
    expect(mocks.audioPlay).toHaveBeenCalledTimes(1);

    await act(async () => {
      MockAudio.instances[1].emit("canplaythrough");
      await presentation.started;
    });

    expect(MockAudio.latest?.currentTime).toBe(0);
    expect(mocks.audioPlay).toHaveBeenCalledTimes(2);
  });

  it("embeds a same-stream lead-in before the first spoken sample", async () => {
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: MockAudioContext,
    });
    mocks.apiPostBlob.mockResolvedValue(
      new Blob(["audio"], { type: "audio/mpeg" }),
    );

    const { result } = renderHook(() =>
      useInterviewNarration({
        sessionId: "session-1",
        persona: "neutral",
        lang: "en-US",
      }),
    );

    let presentation!: ReturnType<typeof result.current.narrate>;
    act(() => {
      presentation = result.current.narrate("Thank you and goodbye");
    });

    await act(async () => {
      await presentation.started;
    });

    const context = MockAudioContext.latest;
    expect(context).not.toBeNull();
    expect(mocks.sourceStart).toHaveBeenCalledWith(0.03);
    expect(context?.protectedChannel).toHaveLength(504);
    // The lead-in keep-alive samples must sit well above the old ~-84 dBFS
    // noise floor (±2/32768) so power-managed DACs / Bluetooth routes don't
    // auto-mute and clip the first syllable. Lock in the louder amplitude.
    expect(Math.abs(context?.protectedChannel?.[0] ?? 0)).toBeCloseTo(
      48 / 32_768,
    );
    expect(context?.protectedChannel?.[500]).toBeCloseTo(0.1);
    expect(await presentation.durationMs).toBe(4);
    expect(MockAudio.instances).toHaveLength(1);

    act(() => {
      context?.source.onended?.();
    });
    await presentation.finished;
    expect(mocks.contextClose).toHaveBeenCalled();
  });
});
