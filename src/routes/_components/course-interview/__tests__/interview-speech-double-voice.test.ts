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
    act(() => {
      result.current.setRoomConnected(true);
    });
    act(() => {
      result.current.speakIfOn("Hello");
    });
    // The agent speaks this through the room audio — the client must not
    // narrate it again on top.
    expect(mocks.narrate).not.toHaveBeenCalled();
  });

  it("resumes narrating when the room drops (REST fallback has no agent audio)", () => {
    mocks.narrate.mockReturnValue({
      started: Promise.resolve(),
      finished: Promise.resolve(),
    });
    const { result } = renderSpeech();
    act(() => {
      result.current.setRoomConnected(true);
    });
    act(() => {
      result.current.setRoomConnected(false);
    });
    act(() => {
      result.current.speakIfOn("Hello again");
    });
    expect(mocks.narrate).toHaveBeenCalledWith("Hello again");
  });

  it("silences auto-narration even when the student toggle is on (room wins)", () => {
    const { result } = renderSpeech();
    act(() => {
      result.current.setVoiceOn(true);
      result.current.setRoomConnected(true);
    });
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
    act(() => {
      result.current.setRoomConnected(true);
    });
    act(() => {
      result.current.replayIfOn("Past turn");
    });
    // The agent will not re-say a past turn on demand — client narration is
    // the only way to hear it again, so the room gate must not touch replay.
    expect(mocks.narrate).toHaveBeenCalledWith("Past turn");
  });
});
