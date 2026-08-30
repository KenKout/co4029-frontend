import { useCallback, useRef, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { type InterviewStep } from "@/components/interview/interview-progress-steps";
import type {
  InterviewLanguage,
  InterviewOnboardingStage,
  InterviewSessionFinishResponse,
} from "@/lib/api/types";
import { getAuthDisplayName } from "@/lib/auth";
import type {
  InterviewQuestionView,
  InterviewSessionProgress,
} from "@/lib/interview/types";
import type {
  FinishReason,
  InterviewPhase,
} from "@/lib/interview/turn-factory";
import type { useInterviewRouteData } from "./use-interview-route-data";
import type { useInterviewTurnState } from "./use-interview-turn-state";

/**
 * Session phase, transport mode, onboarding and the timer anchors. Third hook
 * group in the page's hook order (see use-course-interview.ts) — moved verbatim
 * from course-interview.tsx.
 */
export function useInterviewPhaseState(
  route: ReturnType<typeof useInterviewRouteData>,
  _turn: ReturnType<typeof useInterviewTurnState>,
) {
  const { i18n } = route;

  const [finishResult, setFinishResult] =
    useState<InterviewSessionFinishResponse | null>(null);
  // True once a rich-closing sub-step (self-reflection / invite-questions) has
  // been surfaced. The assessed questions are already complete at this point,
  // so the composer offers a Skip-and-finish control that ends the interview
  // and goes straight to the Evaluation screen (grading is unaffected).
  const [closingCeremonyActive, setClosingCeremonyActive] = useState(false);
  // Whether the candidate's microphone is published to the room. OFF by
  // default: a typing candidate must not be captured, and the only way audio
  // starts is an explicit toggle. Drives the room provider's `audio` prop, so
  // the provider's own reconnect-sync effect restores the mic after a drop.
  const [micOn, setMicOn] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  // Whether the AI is actively presenting its turn (typing the text out and/or
  // speaking). UNLIKE aiSpeaking this is NOT gated by voiceOn, so the status bar
  // reflects "speaking" even when audio is muted or the session is Vietnamese
  // (no server voice) — otherwise the bar sat frozen on "Waiting for your
  // answer" the whole time the interviewer was clearly typing a reply.
  const [aiPresenting, setAiPresenting] = useState(false);
  // AI turns whose presentation (typing + narration) has finished. The route
  // keeps its own view of this because surfaces rendered OUTSIDE
  // FocusedInterviewStage gate on it — currently the setup checklist, which may
  // only reveal the next step once the interviewer has finished reading the
  // turn that asked for it.
  const [presentedAiTurnIds, setPresentedAiTurnIds] = useState<
    ReadonlySet<string>
  >(() => new Set<string>());
  const [connected, setConnected] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [phase, setPhase] = useState<InterviewPhase>("prestart");
  // Set synchronously when closing begins so the room can keep the LiveKit
  // agent connected for its natural goodbye before the finish request returns.
  const [closingReason, setClosingReason] = useState<FinishReason | null>(null);

  const [onboardingStage, setOnboardingStage] =
    useState<InterviewOnboardingStage>("identity_check");
  const [interviewLanguage, setInterviewLanguage] = useState<InterviewLanguage>(
    i18n.language?.startsWith("vi") ? "vi" : "en",
  );
  const [pendingFirstQuestion, setPendingFirstQuestion] =
    useState<InterviewQuestionView | null>(null);
  // Mid-interview advance: the next question is held here while the standardized
  // transition turn is shown + narrated (Natural Interview Transitions spec).
  // The Question Card is revealed ONLY after the transition finishes presenting
  // (via handleTurnPresented), so the card never appears alongside its transition.
  const [pendingNextQuestion, setPendingNextQuestion] =
    useState<InterviewQuestionView | null>(null);
  // True while the final-question transition is showing before the goodbye
  // (spec §ending: two short turns — final transition, then existing closing).
  const [pendingFinalTransition, setPendingFinalTransition] = useState(false);
  // Candidate display name for the setup checklist's identity row. Uses the
  // existing auth context (same source the dashboard/profile use); no new fetch.
  const { user } = useAuth();
  const candidateName = getAuthDisplayName(user);
  // Coarse Setup → Interview → Completed step for the header indicator (spec §4),
  // projected from the finer-grained InterviewPhase.
  const interviewStep: InterviewStep =
    phase === "closing" || phase === "results"
      ? "completed"
      : phase === "questioning"
        ? "interview"
        : "setup";
  // Once the interview is closing (student confirmed end / final transition /
  // AI is reading the goodbye) or already showing results, the end button must
  // be disabled so a second confirm can't re-submit the finish. Guard both the
  // button (disabled) and the open handler (below) so neither path can fire.
  const endInterviewDisabled = phase === "closing" || phase === "results";
  const openEndDialog = useCallback(() => {
    if (phase === "closing" || phase === "results") return;
    setEndDialogOpen(true);
  }, [phase]);
  const [pendingFinishResult, setPendingFinishResult] =
    useState<InterviewSessionFinishResponse | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const [assessmentStartedAtMs, setAssessmentStartedAtMs] = useState<
    number | null
  >(null);
  // STATE, not a ref: `useInterviewTimeout` schedules a `setTimeout` from this,
  // and a ref cannot appear in that effect's dependency array — so a mid-session
  // reconciliation left the old timer running. It only looked correct because a
  // reconcile used to coincide with a `questioning ⇄ transition` phase flip;
  // snapshots decouple the two, which turns that into a dead-timer bug.
  const [sessionDeadlineAt, setSessionDeadlineAt] = useState<number | null>(
    null,
  );
  const timeoutTriggeredRef = useRef(false);
  // The live turn's in-flight flag, mirrored up from `useInterviewChat` by the
  // workspace screen (the only component inside the room provider). Everything
  // that used to read `respond.isPending` reads this instead.
  const [turnPending, setTurnPending] = useState(false);
  const [sessionProgress, setSessionProgress] =
    useState<InterviewSessionProgress | null>(null);

  return {
    finishResult,
    setFinishResult,
    closingCeremonyActive,
    setClosingCeremonyActive,
    micOn,
    setMicOn,
    endDialogOpen,
    setEndDialogOpen,
    transcriptOpen,
    setTranscriptOpen,
    aiSpeaking,
    setAiSpeaking,
    aiPresenting,
    setAiPresenting,
    presentedAiTurnIds,
    setPresentedAiTurnIds,
    connected,
    setConnected,
    startDialogOpen,
    setStartDialogOpen,
    phase,
    setPhase,
    closingReason,
    setClosingReason,
    onboardingStage,
    setOnboardingStage,
    interviewLanguage,
    setInterviewLanguage,
    pendingFirstQuestion,
    setPendingFirstQuestion,
    pendingNextQuestion,
    setPendingNextQuestion,
    pendingFinalTransition,
    setPendingFinalTransition,
    candidateName,
    interviewStep,
    endInterviewDisabled,
    openEndDialog,
    pendingFinishResult,
    setPendingFinishResult,
    sessionStartedAtRef,
    assessmentStartedAtMs,
    setAssessmentStartedAtMs,
    sessionDeadlineAt,
    setSessionDeadlineAt,
    timeoutTriggeredRef,
    turnPending,
    setTurnPending,
    sessionProgress,
    setSessionProgress,
  };
}
