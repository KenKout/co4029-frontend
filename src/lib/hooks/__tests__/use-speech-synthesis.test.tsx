import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSpeechSynthesis } from "../use-speech-synthesis";

const speechSpeak = vi.fn();
const speechCancel = vi.fn();

class MockSpeechSynthesisUtterance {
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  lang = "";
  rate = 1;
  pitch = 1;
  voice: SpeechSynthesisVoice | null = null;

  constructor(public readonly text: string) {}
}

describe("useSpeechSynthesis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    speechSpeak.mockImplementation(
      (utterance: MockSpeechSynthesisUtterance) => {
        utterance.onstart?.();
        utterance.onend?.();
      },
    );
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        speak: speechSpeak,
        cancel: speechCancel,
        getVoices: () => [],
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: MockSpeechSynthesisUtterance,
    });
    vi.stubGlobal("SpeechSynthesisUtterance", MockSpeechSynthesisUtterance);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("passes the exact visible text after the audio route is warmed", async () => {
    const { result } = renderHook(() => useSpeechSynthesis());
    const onStart = vi.fn();

    await act(async () => {
      await result.current.speak("Thank you and goodbye", {
        lang: "en-US",
        persona: "neutral",
        onStart,
      });
    });

    const utterance = speechSpeak.mock
      .calls[0][0] as MockSpeechSynthesisUtterance;
    expect(utterance.text).toBe("Thank you and goodbye");
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(speechCancel).not.toHaveBeenCalled();
  });
});
