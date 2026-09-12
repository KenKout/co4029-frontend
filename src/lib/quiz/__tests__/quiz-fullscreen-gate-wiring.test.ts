/**
 * Regression tests for the quiz take's MANDATORY fullscreen gate.
 *
 * Two independent bugs let the one signal this feature exists to produce —
 * `fullscreen_exit` on the teacher's attempt timeline — be silently absent:
 *
 *  1. The gate hung off a per-quiz `browser_security` setting that defaulted
 *     to off, so most quizzes never entered fullscreen at all. That setting
 *     has since been retired outright (migration 0114).
 *  2. Even with it switched on, the old deterrent's prompt was declinable, so
 *     a student could carry on windowed and generate zero exits.
 *
 * Both failed OPEN and looked exactly like a well-behaved student. These
 * tests pin the wiring rather than the UI: the gate must be active for ANY
 * live attempt — no quiz setting may switch it off again — and its
 * unexpected-exit callback must reach the integrity reporter.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const record = vi.fn();
const gateCalls: Array<{ active: boolean; onUnexpectedExit?: () => void }> = [];

vi.mock("@/lib/hooks/useAssessmentFullscreenGate", () => ({
  useAssessmentFullscreenGate: (
    active: boolean,
    options: { onUnexpectedExit?: () => void } = {},
  ) => {
    gateCalls.push({ active, onUnexpectedExit: options.onUnexpectedExit });
    return {
      supported: true,
      isFullscreen: false,
      isFullscreenNow: () => false,
      requestState: "idle" as const,
      enter: () => Promise.resolve(true),
      exit: () => Promise.resolve(),
      requiredOpen: active,
      exitCount: 0,
    };
  },
}));

vi.mock("@/lib/hooks/useQuizIntegrityReporter", () => ({
  useQuizIntegrityReporter: () => ({ record }),
}));

// The quiz session's own collaborators are irrelevant here: this test is about
// which flags reach the gate, so everything that talks to the server or owns
// unrelated state is stubbed to something inert.
const quizState = { quiz: null as unknown, taking: null as unknown };

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/lib/api/hooks/quizzes", () => ({
  useStudentQuiz: () => ({ data: quizState.quiz, isLoading: false }),
  useMyQuizAttempts: () => ({ data: [], isLoading: false }),
  useQuizAttemptProgress: () => ({ data: undefined, isLoading: false }),
  useStartQuizAttempt: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSubmitQuizAnswer: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSubmitQuizAttempt: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/lib/quiz/quiz-attempt-session/use-attempt-session-state", () => ({
  useAttemptSessionState: () => makeState(),
}));

let stateSingleton: ReturnType<typeof buildState> | null = null;

function buildState() {
  const noop = () => undefined;
  return {
    taking: quizState.taking,
    setTaking: noop,
    activeAttemptId: quizState.taking ? "attempt-1" : null,
    setActiveAttemptId: noop,
    activeIdx: 0,
    setActiveIdx: noop,
    statuses: [],
    setStatuses: noop,
    submittedSummary: null,
    setSubmittedSummary: noop,
    perQuestionCooldown: {},
    setPerQuestionCooldown: noop,
    hintDialogOpen: false,
    setHintDialogOpen: noop,
    quizStartedAt: null,
    setQuizStartedAt: noop,
    quizElapsed: 0,
    setQuizElapsed: noop,
    timeLeft: 0,
    setTimeLeft: noop,
    pageIndex: 0,
    setPageIndex: noop,
    pageSize: 1,
    setPageSize: noop,
  };
}

function makeState() {
  stateSingleton = buildState();
  return stateSingleton;
}

beforeEach(() => {
  record.mockClear();
  gateCalls.length = 0;
  stateSingleton = null;
});

/** The gate's props on the latest render (`Array.at` is above this target). */
function lastGateCall() {
  return gateCalls[gateCalls.length - 1];
}

async function renderSession() {
  const { useQuizAttemptSession } = await import(
    "@/lib/quiz/use-quiz-attempt-session"
  );
  return renderHook(() => useQuizAttemptSession("quiz-1"));
}

describe("quiz fullscreen gate wiring", () => {
  it("leaves the gate inactive when no attempt is being taken", async () => {
    quizState.quiz = { id: "quiz-1" };
    quizState.taking = null;

    await renderSession();

    expect(lastGateCall()?.active).toBe(false);
  });

  it("activates the gate for every live attempt, with no setting to opt out", async () => {
    // The regression: the retired toggle defaulted to OFF, so the unproctored
    // path was the one most quizzes actually took.
    quizState.quiz = { id: "quiz-1" };
    quizState.taking = { quiz: { time_limit_seconds: null }, questions: [] };

    await renderSession();

    expect(lastGateCall()?.active).toBe(true);
  });

  it("reports an unexpected fullscreen exit as a warning integrity event", async () => {
    quizState.quiz = { id: "quiz-1" };
    quizState.taking = { quiz: { time_limit_seconds: null }, questions: [] };

    await renderSession();
    lastGateCall()?.onUnexpectedExit?.();

    expect(record).toHaveBeenCalledWith({
      event_type: "fullscreen_exit",
      severity: "warning",
    });
  });
});
