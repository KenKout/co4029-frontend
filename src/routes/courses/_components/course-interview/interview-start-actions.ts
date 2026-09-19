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
 * The mandatory CAMERA gate, run before fullscreen so a browser prompt that
 * sits pending (or a denial) does not cost a fullscreen flicker. Resolves
 * false when the interview requires a camera and the gate cannot produce a
 * live local stream — zero mutations in that case; the lobby's camera notice
 * owns the error copy.
 *
 * A falsy `cameraGate` (or `required: false`) passes: the flag is a FE
 * decision (InterviewConfigPublic carries no camera field), so no config
 * plumbing exists yet.
 */
async function ensureInterviewCamera(
  ctx: InterviewActionsContext,
): Promise<boolean> {
  const camera = ctx.cameraGate;
  if (!camera || !camera.required) return true;
  camera.clearError();
  return camera.ensureActive();
}

/**
 * The one start/resume/retry sequencing: CAMERA gate → fullscreen gate →
 * start. `beginSessionAfterFullscreen` is kept as the fullscreen-only tail
 * so legacy callers and the existing fullscreen tests stay valid.
 */
export async function beginSessionAfterCamera(
  ctx: InterviewActionsContext,
  start: () => Promise<void>,
): Promise<void> {
  if (ctx.startInFlightRef.current) return;
  ctx.startInFlightRef.current = true;
  try {
    if (!(await ensureInterviewCamera(ctx))) return;
    const granted = await ctx.fullscreenGate.enter();
    if (!granted || !ctx.fullscreenGate.isFullscreenNow()) return;
    await start();
  } finally {
    ctx.startInFlightRef.current = false;
  }
}

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
  },
) {
  const { payload, firstQuestion, restoredTranscript } = args;
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
      : [makeAiTurn(firstQuestion, false, 0)],
  );
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
) {
  const stage = payload.onboarding_stage ?? "completed";
  const restoredTranscript = (payload.history ?? []).map(restoreHistoryTurn);
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

  if (stage === "completed" && payload.first_question) {
    beginQuestioning(ctx, {
      payload,
      firstQuestion: payload.first_question,
      restoredTranscript,
    });
  } else {
    beginOnboarding(ctx, { payload, restoredTranscript, stage });
  }
  window.dispatchEvent(new CustomEvent("abridge:interview-started"));
}

/**
 * The only place a start body is constructed. No mode field any more: the
 * backend ignores it and every session runs the unified room.
 */
function buildStartBody(ctx: InterviewActionsContext): InterviewSessionStartRequest {
  return {
    recording_consent_accepted: ctx.recordingConsentAccepted,
    recording_consent_policy_version:
      ctx.takingPayload?.recording_policy_version ?? null,
  };
}

function reportStartError(ctx: InterviewActionsContext, err: unknown) {
  toast.error(
    err instanceof ApiError && err.status === 429
      ? ctx.t("course_interview.errors.rate_limited")
      : ctx.t("course_interview.errors.start_failed"),
  );
}

/**
 * The one sequencing every entry into a live session goes through — fresh
 * start, manual resume and retry share it:
 *
 *   1. duplicate guard (one fullscreen request + one start mutation at a time),
 *   2. `await fullscreenGate.enter()` INSIDE the click handler (user gesture —
 *      the browser refuses requestFullscreen without one),
 *   3. re-check the DOM (`isFullscreenNow`), because a resolved promise is not
 *      proof,
 *   4. only then call the start API and commit the session into the UI.
 *
 * A fullscreen failure leaves the caller's screen untouched — the lobby keeps
 * its state, a retry keeps the results screen — and no start API is called,
 * so the backend never creates (and never starts the graded clock on) a
 * session the candidate cannot see.
 */
export async function beginSessionAfterFullscreen(
  ctx: InterviewActionsContext,
  start: () => Promise<void>,
): Promise<void> {
  if (ctx.startInFlightRef.current) return;
  ctx.startInFlightRef.current = true;
  try {
    const granted = await ctx.fullscreenGate.enter();
    if (!granted || !ctx.fullscreenGate.isFullscreenNow()) return;
    try {
      await start();
    } catch (err) {
      // Audit P1 (start-failure): a failed/aborted start must not leave the
      // candidate chromeless at the lobby. Exit fullscreen INTENTIONALLY (so
      // the exit is not logged as an integrity violation) and let the caller
      // render its error surface in a normal window.
      await ctx.fullscreenGate.exit(true);
      throw err;
    }
  } finally {
    ctx.startInFlightRef.current = false;
  }
}

export async function handleStart(ctx: InterviewActionsContext) {
  await beginSessionAfterCamera(ctx, async () => {
    try {
      const payload = await ctx.startSession.mutateAsync(buildStartBody(ctx));
      handleStartSuccess(ctx, payload);
    } catch (err) {
      reportStartError(ctx, err);
    }
  });
}

/**
 * Retry from the results screen (#7). The reset below runs ONLY after the
 * fullscreen gate has granted — a denied request must never wipe the results
 * screen the candidate is looking at. After the reset, the fresh attempt goes
 * through the normal start path. A backend cooldown / attempt-ceiling still
 * guards it (429/409) — the UI only exposes this button when
 * compute_retake_status said a retry is allowed, so the reactive error is a
 * rare race-safety net rather than the norm.
 */
export async function handleRetry(ctx: InterviewActionsContext) {
  if (ctx.startSession.isPending) return;
  await beginSessionAfterCamera(ctx, async () => {
    // Audit P1 (retry wipes results): the reset now runs only after the
    // backend accepted the new session — a failed mutation leaves the
    // results screen (verdict, transcript, retake context) exactly as the
    // candidate was looking at it.
    try {
      const payload = await ctx.startSession.mutateAsync(buildStartBody(ctx));
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
      handleStartSuccess(ctx, payload);
    } catch (err) {
      reportStartError(ctx, err);
    }
  });
}
