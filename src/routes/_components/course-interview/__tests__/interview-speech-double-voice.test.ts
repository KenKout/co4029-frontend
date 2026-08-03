import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useInterviewSpeech } from "../use-interview-speech";

/**
 * The double-voice gate.
 *
 * With the LiveKit text transport live, the agent is IN the session's room and
 * speaks every utterance through the room's audio track (agent-side TTS). The
 * workspace must therefore NOT narrate the same text client-side — the agent's
 * audio lands first, then the client replay starts on top of it (the reported
 * "voice runs again and overlaps" bug). These tests pin the gate:
 *
 *   - `speakIfOn` is silent while the room is connected (agent is the voice)
 *   - `speakIfOn` narrates again as soon as the room drops (REST fallback:
 *     no agent audio, so the client narration is the only voice)
 *   - `replayIfOn` (user-initiated replay) narrates regardless — the agent
 *     will not re-say a past turn on demand
 */

const mocks = vi.hoisted(() => ({
  narrate: vi.fn(),
  cancel: vi.fn(),
  listen: vi.fn(),
  stop: vi.fn(),
  retry: vi.fn(),
}));

vi.mock("@/lib/hooks/use-interview-narration", () => ({
  useInterviewNarration: () => ({
    narrate: mocks.narrate,
    cancel: mocks.cancel,
  }),
}));

vi.mock("@/lib/hooks/use-speech-dictation", () => ({
  useSpeechDictation: () => ({
    supported: true,
    listening: false,
    error: null,
    start: mocks.listen,
    stop: mocks.stop,
    retry: mocks.retry,
  }),
}));

const ROUTE = {
  config: {
    supported_modes: "hybrid",
    persona: "neutral",
  },
  i18n: { language: "en" },
} as never;

const TURN = {
  sessionId: "session-1",
  currentQuestion: { id: "q-1" },
  setAnswerText: vi.fn(),
} as never;

const PHASE = {
  setInputMode: vi.fn(),
  onboardingStage: "completed",
  interviewLanguage: "en",
} as never;

function renderSpeech() {
  return renderHook(() => useInterviewSpeech(ROUTE, TURN, PHASE));
}

/**
 * Simulate the workspace screen's render-phase write: it calls
 * `setRoomConnectedRef` synchronously during render (the narration gate reads
 * THAT), and flips the state in an effect (drives the cancel-on-handover +
 * voice-toggle visibility).
 */
function setRoomLive(result: ReturnType<typeof renderSpeech>["result"], value: boolean) {
  act(() => {
    result.current.setRoomConnectedRef(value);
    result.current.setRoomConnected(value);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useInterviewSpeech double-voice gate", () => {
  it("narrates while the room is not connected (client is the only voice)", () => {
    mocks.narrate.mockReturnValue({
      started: Promise.resolve(),
      finished: Promise.resolve(),
    });
    const { result } = renderSpeech();
    act(() => {
      result.current.speakIfOn("Hello");
    });
    expect(mocks.narrate).toHaveBeenCalledWith("Hello");
  });

  it("stays silent when the LiveKit agent is live in the room", () => {
    const { result } = renderSpeech();
    setRoomLive(result, true);
    act(() => {
      result.current.speakIfOn("Hello");
    });
    // The agent speaks this through the room audio — the client must not
    // narrate it again on top.
    expect(mocks.narrate).not.toHaveBeenCalled();
  });

  it("silences narration the instant the ref is set, even before a re-render", () => {
    // The transition turn mounts in the SAME commit the room handover starts;
    // its narrate() runs in a child effect before the parent state flip. The
    // ref write during render is what must gate it — not the state.
    mocks.narrate.mockReturnValue({
      started: Promise.resolve(),
      finished: Promise.resolve(),
    });
    const { result } = renderSpeech();
    act(() => {
      // Render-phase write only (no state flip yet — the state effect runs
      // after this commit's child effects).
      result.current.setRoomConnectedRef(true);
    });
    act(() => {
      result.current.speakIfOn("Great, the introduction is complete");
    });
    expect(mocks.narrate).not.toHaveBeenCalled();
  });

  it("resumes narrating when the room drops (REST fallback has no agent audio)", () => {
    mocks.narrate.mockReturnValue({
      started: Promise.resolve(),
      finished: Promise.resolve(),
    });
    const { result } = renderSpeech();
    setRoomLive(result, true);
    setRoomLive(result, false);
    act(() => {
      result.current.speakIfOn("Hello again");
    });
    expect(mocks.narrate).toHaveBeenCalledWith("Hello again");
  });

  it("silences auto-narration even when the student toggle is on (room wins)", () => {
    const { result } = renderSpeech();
    act(() => {
      result.current.setVoiceOn(true);
    });
    setRoomLive(result, true);
    act(() => {
      result.current.speakIfOn("Question text");
    });
    expect(mocks.narrate).not.toHaveBeenCalled();
  });

  it("replay still narrates while the room is connected (user-initiated)", () => {
    mocks.narrate.mockReturnValue({
      started: Promise.resolve(),
      finished: Promise.resolve(),
    });
    const { result } = renderSpeech();
    setRoomLive(result, true);
    act(() => {
      result.current.replayIfOn("Past turn");
    });
    // The agent will not re-say a past turn on demand — client narration is
    // the only way to hear it again, so the room gate must not touch replay.
    expect(mocks.narrate).toHaveBeenCalledWith("Past turn");
  });

  it("cuts in-flight client narration the moment the room handover starts", () => {
    // The last setup turn may still be narrating when onboarding completes and
    // the agent starts joining — without the cut its tail would overlap the
    // agent's opening utterance.
    const { result } = renderSpeech();
    act(() => {
      result.current.speakIfOn("You are all set!");
    });
    expect(mocks.narrate).toHaveBeenCalled();
    mocks.cancel.mockClear();
    setRoomLive(result, true);
    expect(mocks.cancel).toHaveBeenCalled();
  });

  it("does not re-cancel when the room state merely re-renders", () => {
    const { result } = renderSpeech();
    setRoomLive(result, true);
    mocks.cancel.mockClear();
    // Same value re-set (room connected → re-render) must not cancel again.
    setRoomLive(result, true);
    expect(mocks.cancel).not.toHaveBeenCalled();
  });
});
