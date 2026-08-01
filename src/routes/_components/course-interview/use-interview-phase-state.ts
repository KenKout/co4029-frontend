import { useCallback, useRef, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { type InterviewStep } from "@/components/interview/interview-progress-steps";
import { useInterviewPracticeFeedback } from "@/lib/api/hooks/interviews";
import type {
  InterviewLanguage,
  InterviewOnboardingStage,
  InterviewQuestionPublic,
  InterviewSessionFinishResponse,
  InterviewSessionMode,
} from "@/lib/api/types";
import { getAuthDisplayName } from "@/lib/auth";
import type { ConversationTurn } from "@/lib/interview/types";
import type { InterviewPhase } from "@/lib/interview/turn-factory";
import type { useInterviewRouteData } from "./use-interview-route-data";
import type { useInterviewTurnState } from "./use-interview-turn-state";

/**
 * Session phase, transport mode, onboarding and the timer anchors. Third hook
 * group in the page's hook order (see use-course-interview.ts) — moved verbatim
 * from course-interview.tsx.
 */
export function useInterviewPhaseState(
  route: ReturnType<typeof useInterviewRouteData>,
  turn: ReturnType<typeof useInterviewTurnState>,
) {
  const { i18n } = route;
  const { sessionId } = turn;

  const [finishResult, setFinishResult] =
    useState<InterviewSessionFinishResponse | null>(null);
  // True once a rich-closing sub-step (self-reflection / invite-questions) has
  // been surfaced. The assessed questions are already complete at this point,
  // so the composer offers a Skip-and-finish control that ends the interview
  // and goes straight to the Evaluation screen (grading is unaffected).
  const [closingCeremonyActive, setClosingCeremonyActive] = useState(false);
  const [inputMode, setInputMode] = useState<"voice" | "text" | "hybrid">(
    "text",
  );
  // Practice vs graded. Defaults to graded: an unset picker must never produce
  // an ungraded run, and the server defaults the same way.
  const [sessionMode, setSessionMode] =
    useState<InterviewSessionMode>("assessment");
  // true = voice session started and LiveKitRoom is active
  const [voiceActive, setVoiceActive] = useState(false);
  // polling active when voice session is completing
  const [pollingCompletion, setPollingCompletion] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  // Whether the AI is actively presenting its turn (typing the text out and/or
  // speaking). UNLIKE aiSpeaking this is NOT gated by voiceOn, so the status bar
  // reflects "speaking" even when audio is muted or the session is Vietnamese
  // (no server voice) — otherwise the bar sat frozen on "Waiting for your
  // answer" the whole time the interviewer was clearly typing a reply.
  const [aiPresenting, setAiPresenting] = useState(false);
  // AI turns whose presentation (typing + narration) has finished. The docked
  // TranscriptPanel is rendered here rather than inside FocusedInterviewStage,
  // so it needs its own view of this — otherwise a question the interviewer had
  // not finished reading appeared in the panel in full (the panel renders turns
  // with isLatest={false}, which paints text immediately).
  const [presentedAiTurnIds, setPresentedAiTurnIds] = useState<
    ReadonlySet<string>
  >(() => new Set<string>());
  const [connected, setConnected] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [phase, setPhase] = useState<InterviewPhase>("prestart");

  // Only for a finished rehearsal. A graded session 404s on this route by
  // design — per-criterion verdicts are the raw material of a pass/fail
  // decision, and students get the binary verdict plus prose, never the
  // breakdown (thesis §4.3).
  const { data: practiceFeedback } = useInterviewPracticeFeedback(sessionId, {
    enabled: sessionMode === "practice" && phase === "results",
  });
  const [onboardingStage, setOnboardingStage] =
    useState<InterviewOnboardingStage>("identity_check");
  const [interviewLanguage, setInterviewLanguage] = useState<InterviewLanguage>(
    i18n.language?.startsWith("vi") ? "vi" : "en",
  );
  const [pendingFirstQuestion, setPendingFirstQuestion] =
    useState<InterviewQuestionPublic | null>(null);
  // Mid-interview advance: the next question is held here while the standardized
  // transition turn is shown + narrated (Natural Interview Transitions spec).
  // The Question Card is revealed ONLY after the transition finishes presenting
  // (via handleTurnPresented), so the card never appears alongside its transition.
  const [pendingNextQuestion, setPendingNextQuestion] =
    useState<InterviewQuestionPublic | null>(null);
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
  const voiceInitialTranscriptRef = useRef<ConversationTurn[]>([]);
  const [assessmentStartedAtMs, setAssessmentStartedAtMs] = useState<
    number | null
  >(null);
  const sessionDeadlineAtRef = useRef<number | null>(null);
  const timeoutTriggeredRef = useRef(false);

  return {
    finishResult,
    setFinishResult,
    closingCeremonyActive,
    setClosingCeremonyActive,
    inputMode,
    setInputMode,
    sessionMode,
    setSessionMode,
    voiceActive,
    setVoiceActive,
    pollingCompletion,
    setPollingCompletion,
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
    practiceFeedback,
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
    voiceInitialTranscriptRef,
    assessmentStartedAtMs,
    setAssessmentStartedAtMs,
    sessionDeadlineAtRef,
    timeoutTriggeredRef,
  };
}
