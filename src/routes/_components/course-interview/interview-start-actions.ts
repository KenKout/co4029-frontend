import { toast } from "sonner";

import { ApiError } from "@/lib/api/client";
import type {
  InterviewOnboardingStage,
  InterviewQuestionPublic,
  InterviewSessionStartRequest,
  InterviewSessionStartResponse,
} from "@/lib/api/types";
import type { ConversationTurn } from "@/lib/interview/types";
import {
  makeAiTurn,
  makeCeremonyTurn,
  restoreHistoryTurn,
} from "@/lib/interview/turn-factory";
import type { InterviewActionsContext } from "./types";

/**
 * Session start / retry / voice-fallback handlers, lifted verbatim out of
 * course-interview.tsx. They were plain closures over the page component; the
 * enclosing scope is now passed explicitly as `ctx`.
 */

/**
 * The backend published a config with no answerable question. Roll the whole
 * start back to the lobby (extracted from handleStartSuccess unchanged).
 */
function abandonStartWithoutQuestion(ctx: InterviewActionsContext) {
  toast.error(ctx.t("course_interview.errors.no_question_available"));
  ctx.setSessionId(null);
  ctx.setCurrentQuestion(null);
  ctx.setTranscript([]);
  ctx.sessionStartedAtRef.current = null;
  ctx.setAssessmentStartedAtMs(null);
  ctx.setSessionDeadlineAt(null);
  ctx.setPhase("prestart");
}

function beginQuestioning(
  ctx: InterviewActionsContext,
  args: {
    payload: InterviewSessionStartResponse;
    firstQuestion: InterviewQuestionPublic;
    restoredTranscript: ConversationTurn[];
    voiceSession: boolean;
  },
) {
  const { payload, firstQuestion, restoredTranscript, voiceSession } = args;
  const assessmentStart = payload.assessment_started_at
    ? new Date(payload.assessment_started_at).getTime()
    : Date.now();
  ctx.sessionStartedAtRef.current = assessmentStart;
  ctx.setAssessmentStartedAtMs(assessmentStart);
  ctx.setSessionDeadlineAt(
    payload.time_remaining_seconds == null
      ? null
      : Date.now() + payload.time_remaining_seconds * 1000,
  );
  ctx.setPhase("questioning");
  ctx.setCurrentQuestion(firstQuestion);
  ctx.setTranscript(
    restoredTranscript.length > 0
      ? restoredTranscript
      : voiceSession
        ? []
        : [makeAiTurn(firstQuestion, false, 0)],
  );
  if (voiceSession) ctx.setVoiceActive(true);
}

function beginOnboarding(
  ctx: InterviewActionsContext,
  args: {
    payload: InterviewSessionStartResponse;
    restoredTranscript: ConversationTurn[];
    stage: InterviewOnboardingStage;
  },
) {
  const { payload, restoredTranscript, stage } = args;
  ctx.sessionStartedAtRef.current = null;
  ctx.setAssessmentStartedAtMs(null);
  ctx.setSessionDeadlineAt(null);
  ctx.setCurrentQuestion(null);
  ctx.setPhase(stage === "readiness" ? "readiness" : "opening");
  ctx.setTranscript(
    restoredTranscript.length > 0
      ? restoredTranscript
      : payload.opening_text
        ? [
            makeCeremonyTurn(
              stage === "readiness" ? "briefing" : "opening",
              payload.opening_text,
              payload.session_id,
            ),
          ]
        : [],
  );
}

export function handleStartSuccess(
  ctx: InterviewActionsContext,
  payload: InterviewSessionStartResponse,
  voiceSession = false,
) {
  const stage = payload.onboarding_stage ?? "completed";
  const restoredTranscript = (payload.history ?? []).map(restoreHistoryTurn);
  ctx.voiceInitialTranscriptRef.current = restoredTranscript;
  if (stage === "completed" && !payload.first_question) {
    abandonStartWithoutQuestion(ctx);
    return;
  }
  const language = payload.interview_language ?? ctx.interviewLanguage;
  ctx.setInterviewLanguage(language);
  void ctx.i18n.changeLanguage(language);
  ctx.setOnboardingStage(stage);
  ctx.timeoutTriggeredRef.current = false;
  ctx.setVoiceOn(true);
  ctx.setTranscriptOpen(false);
  ctx.setConnected(true);
  ctx.setSessionId(payload.session_id);
  ctx.setPendingFirstQuestion(null);
  // The server is authoritative here, not the picker. Start is idempotent, so
  // resuming a live session returns the mode it was created with — trusting
  // local state would mislabel a resumed practice run as graded, or worse.
  if (payload.session_mode) ctx.setSessionMode(payload.session_mode);

  if (stage === "completed" && payload.first_question) {
    beginQuestioning(ctx, {
      payload,
      firstQuestion: payload.first_question,
      restoredTranscript,
      voiceSession,
    });
  } else {
    beginOnboarding(ctx, { payload, restoredTranscript, stage });
  }
  window.dispatchEvent(new CustomEvent("abridge:interview-started"));
}

/** Request mic permission; returns true if granted, false otherwise */
async function checkMicPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Release the test stream immediately — LiveKit will re-acquire
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

/**
 * The only place a start body is constructed.
 *
 * There are four call sites that begin or re-enter a session, and dropping
 * `session_mode` from any one of them fails in the worst direction: the
 * student picks "practice" and is silently graded. Routing every one of them
 * through here makes that omission impossible rather than merely unlikely.
 *
 * `mode` is passed explicitly by the two callers that mean something other
 * than "whatever the picker says" — see handleRetry.
 */
function buildStartBody(
  ctx: InterviewActionsContext,
  overrides: Partial<InterviewSessionStartRequest> = {},
): InterviewSessionStartRequest {
  return {
    input_mode: ctx.inputMode,
    session_mode: ctx.sessionMode,
    ...overrides,
  };
}

/**
 * Start errors, with the practice conflicts named.
 *
 * A 409 from a practice request is not "you are out of attempts" — no graded
 * attempt was consumed. Collapsing them into the generic failure toast would
 * tell the student something false about their remaining tries.
 */
function reportStartError(ctx: InterviewActionsContext, err: unknown) {
  if (err instanceof ApiError && err.status === 409) {
    if (err.code === "practice_limit_reached") {
      toast.error(ctx.t("course_interview.mode.errors.practice_limit"));
      return;
    }
    if (err.code === "practice_unavailable") {
      toast.error(ctx.t("course_interview.mode.errors.practice_unavailable"));
      return;
    }
  }
  toast.error(
    err instanceof ApiError && err.status === 429
      ? ctx.t("course_interview.errors.rate_limited")
      : ctx.t("course_interview.errors.start_failed"),
  );
}

export async function handleStart(ctx: InterviewActionsContext) {
  const isVoice = ctx.inputMode === "voice";

  if (isVoice) {
    const granted = await checkMicPermission();
    if (!granted) {
      toast.error("Microphone access denied. Falling back to text interview.");
      ctx.setInputMode("text");
      // Fall through to start a text session
      try {
        const payload = await ctx.startSession.mutateAsync(
          buildStartBody(ctx, { input_mode: "text" }),
        );
        handleStartSuccess(ctx, payload);
      } catch (err) {
        reportStartError(ctx, err);
      }
      return;
    }
  }

  try {
    const payload = await ctx.startSession.mutateAsync(buildStartBody(ctx));
    handleStartSuccess(ctx, payload, isVoice);
    // Only enter voice mode when handleStartSuccess actually committed to a
    // session — i.e. the backend returned a first question. When it didn't
    // (e.g. config published with only pending questions), the toast in
    // handleStartSuccess already informed the user; staying on the
    // mode-selection screen lets them retry without joining an empty room.
  } catch (err) {
    reportStartError(ctx, err);
  }
}

/**
 * Retry from the results screen (#7). Clears the finished-session state back
 * to a clean slate, then starts a fresh attempt via the normal start path.
 * A backend cooldown / attempt-ceiling still guards it (429/409) — the UI
 * only exposes this button when compute_retake_status said a retry is allowed,
 * so the reactive error is a rare race-safety net rather than the norm.
 */
export async function handleRetry(ctx: InterviewActionsContext) {
  if (ctx.startSession.isPending) return;
  ctx.setFinishResult(null);
  ctx.setPendingFinishResult(null);
  ctx.setTranscript([]);
  ctx.setCurrentQuestion(null);
  ctx.setPendingFirstQuestion(null);
  ctx.setPendingNextQuestion(null);
  ctx.setSessionId(null);
  ctx.setAnswerText("");
  ctx.setPhase("prestart");
  ctx.sessionStartedAtRef.current = null;
  ctx.setAssessmentStartedAtMs(null);
  ctx.setSessionDeadlineAt(null);
  ctx.timeoutTriggeredRef.current = false;
  try {
    // Explicitly graded. "Retry" on the results screen means another real
    // attempt; a rehearsal is chosen from the lobby, not reached by retrying.
    const payload = await ctx.startSession.mutateAsync(
      buildStartBody(ctx, { input_mode: "text", session_mode: "assessment" }),
    );
    handleStartSuccess(ctx, payload);
  } catch (err) {
    reportStartError(ctx, err);
  }
}

/** Agent departure is natural completion; the call button is an early end. */
export function handleVoiceCompleted(
  ctx: InterviewActionsContext,
  reason: "natural" | "ended_early",
) {
  ctx.setVoiceActive(false);
  if (reason === "ended_early") {
    void ctx.beginClosing("ended_early");
    return;
  }
  if (ctx.sessionId) {
    ctx.finish.mutate({ reason: "natural" }, { onError: () => undefined });
  }
  ctx.setPollingCompletion(true);
}

/**
 * Voice room is unavailable for a transient reason — dropped (network/server)
 * OR the agent never joined (worker unavailable, dispatch never happened).
 * Both are NOT a natural end (resilience A-Tier-1 #3): do NOT finalize+grade
 * the session. Tear down the room, switch the live session to text, restore
 * the transcript captured so far, and resume questioning in place so the
 * student keeps going instead of losing a graded attempt to a blip.
 *
 * The caller may override the toast with a more accurate message key: "voice
 * connection lost" is wrong when nothing ever connected.
 */
export async function handleVoiceDropped(
  ctx: InterviewActionsContext,
  opts?: { messageKey?: string },
) {
  ctx.setVoiceActive(false);
  ctx.setInputMode("text");
  toast.warning(
    ctx.t(opts?.messageKey ?? "course_interview.voice.dropped_fallback_text"),
  );
  // Re-enter via the idempotent start path in TEXT mode: it returns the SAME
  // in-progress session with full history + the current question, so the
  // student resumes exactly where the voice room dropped — no finalize, no
  // lost turns. (start_session is idempotent for a live session.) We call the
  // mutation directly with input_mode:"text" rather than handleStart() because
  // the setInputMode above hasn't flushed yet — handleStart's closure would
  // still read the stale "voice" mode and re-enter the room.
  try {
    const payload = await ctx.startSession.mutateAsync(
      buildStartBody(ctx, { input_mode: "text" }),
    );
    handleStartSuccess(ctx, payload);
  } catch {
    toast.error(ctx.t("course_interview.errors.start_failed"));
  }
}
