import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import { useInterviewActions } from "@/routes/courses/_components/course-interview/use-interview-actions";
import type { InterviewBase } from "@/routes/courses/_components/course-interview/types";

/**
 * Audit P2 fixes pinned at the actions layer:
 *
 * 1. Finish failure keeps the draft — `beginClosing` parks the composer text
 *    before clearing it, and on a rejected /finish restores the EXACT text
 *    (the debounced autosave would otherwise persist "" and destroy both
 *    copies). Only a confirmed terminal result may clear it.
 * 2. An intentional leave clears the per-config resume marker — a same-tab
 *    revisit must not auto-open the resume dialog for an attempt the
 *    candidate deliberately walked away from.
 */

function makeBase(over: Partial<Record<string, unknown>> = {}): InterviewBase {
  return {
    sessionId: "sess-1",
    phase: "questioning",
    answerText: "my half-typed answer",
    configId: "cfg-9",
    narration: { cancel: vi.fn() },
    finish: { mutateAsync: vi.fn() },
    setAnswerText: vi.fn(),
    setEndDialogOpen: vi.fn(),
    setAiSpeaking: vi.fn(),
    setAiPresenting: vi.fn(),
    setClosingReason: vi.fn(),
    setPhase: vi.fn(),
    setCurrentQuestion: vi.fn(),
    setPendingFirstQuestion: vi.fn(),
    setPendingFinishResult: vi.fn(),
    setTranscript: vi.fn(),
    setFinishResult: vi.fn(),
    setStartDialogOpen: vi.fn(),
    sessionStartedAtRef: { current: null },
    timeoutTriggeredRef: { current: false },
    assessmentStartedAtMs: null,
    leaveBlocker: { status: "idle" },
    t: (key: string) => key,
    ...over,
  } as unknown as InterviewBase;
}

beforeEach(() => {
  window.sessionStorage.clear();
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

describe("beginClosing draft preservation", () => {
  it("restores the exact composer text when finish rejects", async () => {
    const finish = {
      mutateAsync: vi.fn().mockRejectedValue(new Error("503 upstream")),
    };
    const setAnswerText = vi.fn();
    const base = makeBase({ finish, setAnswerText });
    const { result } = renderHook(() => useInterviewActions(base));

    await result.current.beginClosing("ended_early");

    // Cleared first (so the composer closes with the session)…
    expect(setAnswerText).toHaveBeenCalledWith("");
    // …then restored to the EXACT parked text on failure.
    expect(setAnswerText).toHaveBeenLastCalledWith("my half-typed answer");
    expect(base.phase as string).toBe("questioning");
  });

  it("does not restore after a confirmed terminal result", async () => {
    const finish = {
      mutateAsync: vi
        .fn()
        .mockResolvedValue({ closing_text: null, attempt_number: 1 }),
    };
    const setAnswerText = vi.fn();
    const base = makeBase({ finish, setAnswerText });
    const { result } = renderHook(() => useInterviewActions(base));

    await result.current.beginClosing("ended_early");

    expect(setAnswerText).toHaveBeenCalledWith("");
    expect(setAnswerText).toHaveBeenCalledTimes(1);
  });
});

describe("intentional leave clears the resume marker", () => {
  it("removes the marker so the auto-resume dialog does not reopen", async () => {
    window.sessionStorage.setItem("abridge:iv-active:cfg-9", "sess-1");
    const proceed = vi.fn();
    const base = makeBase({
      leaveBlocker: { status: "blocked", proceed, reset: vi.fn() },
    });
    const { result } = renderHook(() => useInterviewActions(base));

    result.current.leaveInterviewOpen();

    expect(proceed).toHaveBeenCalled();
    expect(window.sessionStorage.getItem("abridge:iv-active:cfg-9")).toBeNull();
  });
});
