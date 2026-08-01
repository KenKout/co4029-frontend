import type { ReactNode } from "react";

import { EndConfirmationPanel } from "@/components/interview/dialogs";
import { SubmittedAnswerConfirmation } from "@/components/interview/submitted-answer-confirmation";
import type { SetupStage } from "@/components/interview/setup-checklist";
import type { InterviewOnboardingStage } from "@/lib/api/types";
import type { InterviewPhase } from "@/lib/interview/turn-factory";
import type { CourseInterviewController } from "./use-course-interview";

/**
 * Derivations the text/hybrid workspace feeds into FocusedInterviewStage, all
 * moved verbatim out of course-interview.tsx. `renderSubmissionSlot` is a plain
 * function rather than a component so it keeps yielding `null` — not an element
 * that renders nothing — in exactly the cases the pre-split page did.
 */

type Translate = CourseInterviewController["t"];

/**
 * Throughout onboarding (opening/readiness) the SetupChecklist is the sole input
 * surface; the composer is hidden until setup completes.
 */
export function resolveSetupStage(
  phase: InterviewPhase,
  onboardingStage: InterviewOnboardingStage,
): SetupStage | null {
  return (phase === "opening" || phase === "readiness") &&
    onboardingStage !== "completed"
    ? onboardingStage
    : null;
}

export function resolveIsUserTyping(iv: CourseInterviewController): boolean {
  return (
    !iv.respond.isPending &&
    !iv.onboarding.isPending &&
    (iv.answerText.trim().length > 0 || iv.dictation.interim.trim().length > 0)
  );
}

export function resolveStageStatusMessage(
  iv: CourseInterviewController,
  t: Translate,
): string | undefined {
  return iv.agentStatus === "error"
    ? iv.dictationHasError && iv.dictation.error
      ? t(`course_interview.workspace.microphone_errors.${iv.dictation.error}`)
      : t("course_interview.workspace.answer_recovery_error")
    : undefined;
}

/**
 * Compact main-screen confirmation for the most recent answer (spec §2/§8).
 * One card, three shapes, never conflicting: failed (draft preserved + retry),
 * submitted (preview + view full), or the collapsed "previous" acknowledgement
 * once the answer is no longer the active one (next question / follow-up).
 */
export function renderSubmissionSlot(iv: CourseInterviewController): ReactNode {
  const { currentQuestion, recentSubmission, answer } = iv;
  // Open the transcript (docked panel on desktop, Sheet on mobile) at the full
  // submitted answer.
  const openTranscript = () => iv.setTranscriptOpen(true);
  const answerStatus = answer.state;
  const isCurrentSubmitted =
    answerStatus.status === "submitted" &&
    recentSubmission?.questionId === currentQuestion?.id;

  return iv.phase !== "questioning" ? null : iv.endConfirming ? (
    <EndConfirmationPanel
      prompt={iv.endConfirmPrompt}
      onContinue={() => void iv.handleEndCancel()}
      onEndAndSubmit={() => void iv.handleEndConfirm()}
      isPending={iv.respond.isPending}
    />
  ) : answerStatus.status === "submitting" ? (
    // B-Tier-1 #13: unmistakable in-flight state while the answer is sent.
    <SubmittedAnswerConfirmation
      status="submitting"
      answer={answerStatus.draft}
    />
  ) : answerStatus.status === "failed" ? (
    <SubmittedAnswerConfirmation
      status="failed"
      answer={answerStatus.draft}
      onRetry={() =>
        void iv.handleRespond(answerStatus.draft, {
          retrySubmissionId: answerStatus.submissionId,
        })
      }
      onContinueEditing={() => answer.setDraft(answerStatus.draft)}
    />
  ) : recentSubmission ? (
    <SubmittedAnswerConfirmation
      status="submitted"
      answer={recentSubmission.answer}
      previous={!isCurrentSubmitted}
      onViewFullAnswer={openTranscript}
    />
  ) : null;
}
