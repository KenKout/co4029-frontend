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
function buildStartBody(): InterviewSessionStartRequest {
  return {};
}

function reportStartError(ctx: InterviewActionsContext, err: unknown) {
  toast.error(
    err instanceof ApiError && err.status === 429
      ? ctx.t("course_interview.errors.rate_limited")
      : ctx.t("course_interview.errors.start_failed"),
  );
}

export async function handleStart(ctx: InterviewActionsContext) {
  try {
    const payload = await ctx.startSession.mutateAsync(buildStartBody());
    handleStartSuccess(ctx, payload);
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
    const payload = await ctx.startSession.mutateAsync(buildStartBody());
    handleStartSuccess(ctx, payload);
  } catch (err) {
    reportStartError(ctx, err);
  }
}
