import { toast } from "sonner";

import type {
  InterviewLanguage,
  InterviewOnboardingAction,
  InterviewQuestionPublic,
} from "@/lib/api/types";
import {
  makeAiTurn,
  makeCeremonyTurn,
  makeUserTurn,
  newTurnKey,
} from "@/lib/interview/turn-factory";
import type { InterviewActionsContext } from "./types";

/**
 * Onboarding turn submission (identity → language → readiness), lifted verbatim
 * out of course-interview.tsx with the page closure passed explicitly as `ctx`.
 */

type OnboardingResult = Awaited<
  ReturnType<InterviewActionsContext["onboarding"]["mutateAsync"]>
>;

function resolveSubmittedText(
  ctx: InterviewActionsContext,
  args: {
    action?: InterviewOnboardingAction;
    languageOverride?: InterviewLanguage;
    nameOverride?: string;
    naturalText: string;
  },
): string {
  const { action, languageOverride, nameOverride, naturalText } = args;
  const guidedText = action
    ? ctx.t(`course_interview.onboarding.action_messages.${action}`, {
        lng: languageOverride ?? ctx.interviewLanguage,
      })
    : "";
  // set_name carries the candidate's typed name verbatim as the response
  // text; the backend persists it as the session-scoped preferred name.
  return action === "set_name" && nameOverride?.trim()
    ? nameOverride.trim()
    : naturalText || guidedText;
}

function appendOnboardingAiTurn(
  ctx: InterviewActionsContext,
  result: OnboardingResult,
  turnKey: string,
) {
  ctx.setTranscript((previous) => [
    ...previous,
    makeCeremonyTurn(
      result.onboarding_stage === "readiness" ? "briefing" : "opening",
      result.ai_text!,
      `${ctx.sessionId}-${turnKey}`,
    ),
  ]);
}

function startAssessmentFromOnboarding(
  ctx: InterviewActionsContext,
  result: OnboardingResult,
  firstQuestion: InterviewQuestionPublic,
) {
  const assessmentStart = result.assessment_started_at
    ? new Date(result.assessment_started_at).getTime()
    : Date.now();
  ctx.sessionStartedAtRef.current = assessmentStart;
  ctx.setAssessmentStartedAtMs(assessmentStart);
  ctx.setSessionDeadlineAt(
    result.time_remaining_seconds == null
      ? null
      : Date.now() + result.time_remaining_seconds * 1000,
  );
  ctx.timeoutTriggeredRef.current = false;
  revealFirstQuestion(ctx, firstQuestion);
}

/**
 * Show question one immediately and let the interviewer speak it.
 *
 * Replaces a two-step beat that no longer had a first step. The server's
 * "Great — the introduction is complete. Let's begin. Here is your first
 * question." was parked as a `transition` turn, and the room was held back while
 * it presented so the CLIENT could narrate it. But `resolveAgentOwnsTheVoice`
 * returns true the moment onboarding completes, so the narration gate had already
 * muted the client — the line was silent text, and the only thing the hold still
 * bought was a delayed agent join. The candidate got dead air, then heard the
 * agent start mid-way through the presentation and rush to catch up.
 *
 * So the line is gone (the agent owns its own opening: `NativeInterviewAgent.
 * on_enter` speaks the question verbatim) and the card is committed here. It has
 * to be a TRANSCRIPT turn, not just `currentQuestion` — the pinned card is the
 * last AI turn in the transcript.
 */
function revealFirstQuestion(
  ctx: InterviewActionsContext,
  question: InterviewQuestionPublic,
): void {
  ctx.setCurrentQuestion(question);
  ctx.setPhase("questioning");
  if (ctx.inputMode === "voice") {
    ctx.setVoiceActive(true);
  }
  ctx.setTranscript((previous) => {
    const turn = makeAiTurn(question, false, 0);
    return previous.some((existing) => existing.id === turn.id)
      ? previous
      : [...previous, turn];
  });
}

export async function handleOnboarding(
  ctx: InterviewActionsContext,
  action?: InterviewOnboardingAction,
  languageOverride?: InterviewLanguage,
  nameOverride?: string,
) {
  if (!ctx.sessionId || ctx.onboardingStage === "completed") return;
  const pendingInterim = ctx.dictation.listening ? ctx.dictation.stop() : "";
  const naturalText = [ctx.answerText.trim(), pendingInterim]
    .filter(Boolean)
    .join(" ")
    .trim();
  const submittedText = resolveSubmittedText(ctx, {
    action,
    languageOverride,
    nameOverride,
    naturalText,
  });
  if (!submittedText) {
    toast.error(ctx.t("course_interview.onboarding.response_required"));
    return;
  }

  const turnKey = newTurnKey();
  ctx.setTranscript((previous) => [
    ...previous,
    makeUserTurn(submittedText, turnKey),
  ]);
  ctx.setAnswerText("");

  try {
    const result = await ctx.onboarding.mutateAsync({
      stage: ctx.onboardingStage,
      response_text: submittedText,
      action,
      language: languageOverride ?? ctx.interviewLanguage,
      turn_key: turnKey,
    });
    ctx.setInterviewLanguage(result.interview_language);
    void ctx.i18n.changeLanguage(result.interview_language);
    ctx.setOnboardingStage(result.onboarding_stage);

    // Not on completion: `ai_text` is then the server's "Great — the introduction
    // is complete. Let's begin. Here is your first question." handoff, and the
    // interviewer owns its own opening now (see `revealFirstQuestion`). Appending
    // it put a line on screen that nobody ever spoke — and because its kind is not
    // one the live agent voices, nothing downstream could drop it.
    if (result.ai_text && !result.is_complete) {
      appendOnboardingAiTurn(ctx, result, turnKey);
    }

    if (result.is_complete) {
      if (!result.first_question) {
        toast.error(ctx.t("course_interview.errors.no_question_available"));
        return;
      }
      startAssessmentFromOnboarding(ctx, result, result.first_question);
    } else {
      ctx.setPhase(
        result.onboarding_stage === "readiness" ? "readiness" : "opening",
      );
    }
  } catch (error) {
    ctx.setTranscript((previous) =>
      previous.filter((turn) => turn.id !== `a-${turnKey}`),
    );
    ctx.setAnswerText(naturalText);
    toast.error(
      (error as Error).message ||
        ctx.t("course_interview.onboarding.send_failed"),
    );
  }
}
