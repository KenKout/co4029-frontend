import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  History,
  Infinity as InfinityIcon,
  ListChecks,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { useCourseBySlug } from "@/lib/api/hooks/courses";
import {
  useFinishInterview,
  useGapReport,
  useInterviewForTaking,
  useInterviewOnboarding,
  useInterviewRespond,
  useInterviewSession,
  useMyInterviewSessions,
  useStartInterviewSession,
} from "@/lib/api/hooks/interviews";
import { ApiError } from "@/lib/api/client";
import type {
  InterviewQuestionPublic,
  InterviewLanguage,
  InterviewOnboardingAction,
  InterviewOnboardingStage,
  InterviewSessionFinishResponse,
  InterviewSessionHistoryTurn,
  InterviewSessionStartResponse,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { VoiceRoom } from "@/components/interview/voice-room";
import { useSpeechDictation } from "@/lib/hooks/use-speech-dictation";
import { type SpeechPersona } from "@/lib/hooks/use-speech-synthesis";
import { useInterviewNarration } from "@/lib/hooks/use-interview-narration";
import {
  EndConfirmationPanel,
  EndInterviewDialog,
  FocusedAnswerComposer,
  FocusedInterviewStage,
  InterviewHeader,
  LeaveInterviewDialog,
  StartInterviewDialog,
  TranscriptPanel,
  type ConversationTurn,
  type InterviewAgentStatus,
  resolveInterviewState,
  useInterviewTimer,
} from "@/components/interview/interview-workspace";
import { SetupChecklist } from "@/components/interview/setup-checklist";
import {
  InterviewProgressSteps,
  type InterviewStep,
} from "@/components/interview/interview-progress-steps";
import { ConnectionLostBanner } from "@/components/interview/error-banner";
import { useAuth } from "@/components/auth/AuthProvider";
import { getAuthDisplayName } from "@/lib/auth";
import { SubmittedAnswerConfirmation } from "@/components/interview/submitted-answer-confirmation";
import {
  CANCEL_END_REPLY,
  CONFIRM_END_REPLY,
  endConfirmationPrompt,
  isAwaitingEndConfirmation,
  isClosingTurn,
} from "@/lib/interview/end-confirmation";
import { useAnswerState } from "@/lib/interview/use-answer-state";
import { useDraftAutosave } from "@/lib/interview/use-draft-autosave";
import { normalizeQuestionText } from "@/lib/interview/question-content";
import { planTransition } from "@/lib/interview/transition-sequencing";

function questionTypeLabel(
  type: string | null | undefined,
  t: (k: string) => string,
) {
  switch (type) {
    case "conceptual":
      return t("course_interview.question_types.conceptual");
    case "behavioral":
      return t("course_interview.question_types.behavioral");
    case "technical":
      return t("course_interview.question_types.technical");
    case "situational":
      return t("course_interview.question_types.situational");
    case "system_design":
      return t("course_interview.question_types.system_design");
    default:
      return null;
  }
}

function makeAiTurn(
  question: InterviewQuestionPublic,
  isFollowUp = false,
  elapsedSeconds = 0,
): ConversationTurn {
  // Normalize at the data-mapping seam (spec §6): strip any guardrail / policy /
  // wrapper text that leaked into prompt_text so the Question Card only ever
  // renders the actual question. Fall back to the raw prompt only when
  // sanitization removed everything (avoids a blank card for an odd-but-valid
  // prompt the patterns over-matched).
  const { text } = normalizeQuestionText(question.prompt_text);
  return {
    id: `q-${question.id}-${isFollowUp ? "f" : "m"}`,
    role: "ai",
    text: text || question.prompt_text,
    elapsedSeconds,
    questionType: question.question_type,
    isFollowUp,
    kind: isFollowUp ? "followup" : "question",
  };
}

function makeFollowUpTurn(
  text: string,
  key: string,
  elapsedSeconds: number,
  kind: "followup" | "clarification" | "hint" = "followup",
): ConversationTurn {
  return {
    id: `f-${key}`,
    role: "ai",
    text,
    elapsedSeconds,
    isFollowUp: true,
    kind,
  };
}

function makeUserTurn(
  text: string,
  key: string,
  elapsedSeconds?: number,
  kind: "answer" | "clarification" | "hint" = "answer",
): ConversationTurn {
  return { id: `a-${key}`, role: "user", text, elapsedSeconds, kind };
}

type InterviewTurnAction =
  | "answer"
  | "repeat"
  | "clarify"
  | "explain_term"
  | "hint";

type InterviewPhase =
  | "prestart"
  | "opening"
  | "readiness"
  | "transition"
  | "questioning"
  | "closing"
  | "results";

type FinishReason = "natural" | "ended_early" | "timed_out";

function makeCeremonyTurn(
  kind: "opening" | "briefing" | "transition" | "closing",
  text: string,
  sessionId: string,
  elapsedSeconds?: number,
): ConversationTurn {
  return {
    id: `${kind}-${sessionId}`,
    role: "ai",
    text,
    elapsedSeconds,
    kind,
  };
}

function restoreHistoryTurn(
  turn: InterviewSessionHistoryTurn,
): ConversationTurn {
  return {
    id: turn.id,
    role: turn.role,
    text: turn.content_text,
    elapsedSeconds: turn.elapsed_seconds ?? undefined,
    questionType: turn.question_type,
    isFollowUp: turn.is_follow_up,
    kind: turn.kind,
  };
}

/** A stable idempotency key for one answer submission (adaptive safeguard #1). */
function newTurnKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `tk-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function CourseInterviewPage() {
  const { t, i18n } = useTranslation();
  // Route: /courses/$slug/interview/$moduleId
  // $moduleId carries the interview_config_id (set by course-learn link)
  const { slug, moduleId } = useParams({ strict: false }) as {
    slug: string;
    moduleId: string;
  };
  const configId = moduleId;

  const { data: course, isLoading: courseLoading } = useCourseBySlug(slug);
  const { data: takingPayload, isLoading: configLoading } =
    useInterviewForTaking(configId);
  const config = takingPayload?.config;

  const startSession = useStartInterviewSession(configId);
  const { data: previousSessions, isLoading: previousSessionsLoading } =
    useMyInterviewSessions();
  const resumableSession = useMemo(
    () =>
      previousSessions?.find((session) => {
        if (
          session.interview_config_id !== configId ||
          session.status !== "in_progress"
        ) {
          return false;
        }
        if (
          session.assessment_started_at &&
          session.time_remaining_seconds === 0
        ) {
          return false;
        }
        if (
          session.resume_deadline_at &&
          new Date(session.resume_deadline_at).getTime() <= Date.now()
        ) {
          return false;
        }
        return true;
      }) ?? null,
    [configId, previousSessions],
  );

  // Completed (graded/terminal) past attempts for THIS config, newest first —
  // powers the lobby's attempt-history block. The learner session contract
  // exposes pass_verdict + ended_at (no score %), so we show verdict + date.
  const pastAttempts = useMemo(
    () =>
      (previousSessions ?? [])
        .filter(
          (s) =>
            s.interview_config_id === configId &&
            (s.status === "completed" || s.status === "timed_out"),
        )
        .sort((a, b) => {
          const at = new Date(a.ended_at ?? a.started_at).getTime();
          const bt = new Date(b.ended_at ?? b.started_at).getTime();
          return bt - at;
        }),
    [configId, previousSessions],
  );
  const lastAttempt = pastAttempts[0] ?? null;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] =
    useState<InterviewQuestionPublic | null>(null);
  const [transcript, setTranscript] = useState<ConversationTurn[]>([]);
  const [answerText, setAnswerText] = useState("");
  // Structured submission status for the CURRENT question's answer (spec §7):
  // governs submitting/submitted/failed guards, keeps the draft recoverable on
  // failure, and prevents duplicate submissions. Keyed by question id so a new
  // question resets it while unrelated rerenders never wipe the draft.
  const answer = useAnswerState(currentQuestion?.id ?? "__none__");
  const {
    resetForQuestion: resetAnswerForQuestion,
    reopenForFollowUp,
    beginSubmit,
    submitSucceeded,
    submitFailed,
    restoreDraft,
  } = answer;
  // End-confirmation gate (Slice 4): true after the interviewer asks the
  // candidate to confirm ending (backend `pending_confirmation`). While true
  // the main screen shows Continue / End-and-submit controls, the draft + timer
  // are preserved, and ordinary answer submission is disabled. `endConfirmPrompt`
  // holds the interviewer's confirmation utterance to display.
  const [endConfirming, setEndConfirming] = useState(false);
  const [endConfirmPrompt, setEndConfirmPrompt] = useState("");
  // The most recently acknowledged answer, shown as a compact confirmation on
  // the main screen (spec §8). Persists across the transition to the next
  // question so it can collapse into "✓ Previous answer submitted" rather than
  // vanishing without feedback.
  const [recentSubmission, setRecentSubmission] = useState<{
    answer: string;
    questionId: string;
    submissionId: string;
  } | null>(null);
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
  // true = voice session started and LiveKitRoom is active
  const [voiceActive, setVoiceActive] = useState(false);
  // polling active when voice session is completing
  const [pollingCompletion, setPollingCompletion] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [connected, setConnected] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [phase, setPhase] = useState<InterviewPhase>("prestart");
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
  const [pendingFinishResult, setPendingFinishResult] =
    useState<InterviewSessionFinishResponse | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const voiceInitialTranscriptRef = useRef<ConversationTurn[]>([]);
  const [assessmentStartedAtMs, setAssessmentStartedAtMs] = useState<
    number | null
  >(null);
  const sessionDeadlineAtRef = useRef<number | null>(null);
  const timeoutTriggeredRef = useRef(false);

  // A genuinely new question resets the answer machine to a clean draft keyed
  // by the new id (spec §7). The reducer no-ops when the id is unchanged, so an
  // unrelated rerender that recomputes the same id never wipes the draft. The
  // `recentSubmission` confirmation intentionally survives so it can collapse
  // into "✓ Previous answer submitted" rather than vanishing.
  useEffect(() => {
    if (currentQuestion?.id) resetAnswerForQuestion(currentQuestion.id);
  }, [currentQuestion?.id, resetAnswerForQuestion]);

  // Answer-draft autosave (resilience A-Tier-1 #2): mirror the composer text
  // into localStorage keyed by session+question so a reload / crash / accidental
  // navigation mid-question never loses a half-typed answer.
  const draftAutosave = useDraftAutosave(
    sessionId,
    currentQuestion?.id ?? null,
    answerText,
  );
  const { restore: restoreDraftAutosave, clear: clearDraftAutosave } =
    draftAutosave;

  // On (re)entering a question during active questioning, rehydrate any draft
  // persisted for THIS session+question. Runs only while the composer is live
  // and empty, so it restores after a reload without clobbering fresh typing or
  // a just-submitted state. Keyed by question id so each question restores once.
  const restoredQuestionRef = useRef<string | null>(null);
  useEffect(() => {
    const qid = currentQuestion?.id;
    if (!qid || phase !== "questioning") return;
    if (restoredQuestionRef.current === qid) return;
    restoredQuestionRef.current = qid;
    if (answer.state.status !== "draft" || answerText.trim()) return;
    const saved = restoreDraftAutosave();
    if (saved) {
      setAnswerText(saved);
      restoreDraft(saved);
    }
    // answerText/answer.state are read as a one-shot guard at question entry;
    // re-running on their every change would fight live typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id, phase, restoreDraftAutosave]);

  useEffect(() => {
    const handleOnline = () => setConnected(true);
    const handleOffline = () => setConnected(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const shouldBlockInterviewExit = Boolean(
    sessionId &&
      !pollingCompletion &&
      (phase === "opening" ||
        phase === "readiness" ||
        phase === "transition" ||
        phase === "questioning"),
  );
  const leaveBlocker = useBlocker({
    shouldBlockFn: () => shouldBlockInterviewExit,
    enableBeforeUnload: shouldBlockInterviewExit,
    disabled: !shouldBlockInterviewExit,
    withResolver: true,
  });

  const currentElapsedSeconds = () =>
    sessionStartedAtRef.current === null
      ? 0
      : Math.max(
          0,
          Math.floor((Date.now() - sessionStartedAtRef.current) / 1000),
        );

  // Server-authoritative timer reconciliation (resilience A-Tier-1 #4): the
  // backend returns the true whole-second countdown on each turn. Re-anchor the
  // locally computed deadline to the server clock so client clock skew or a
  // throttled background tab can't drift the timeout. Ignored when the session
  // has no time limit (server returns null) or the value is non-finite.
  const reconcileDeadline = useCallback((remainingSeconds?: number | null) => {
    if (remainingSeconds == null || !Number.isFinite(remainingSeconds)) return;
    sessionDeadlineAtRef.current = Date.now() + remainingSeconds * 1000;
    timeoutTriggeredRef.current = false;
  }, []);

  const respond = useInterviewRespond(sessionId);
  const onboarding = useInterviewOnboarding(sessionId);
  const finish = useFinishInterview(sessionId);
  // Don't keep polling for a gap report that will never be generated once
  // the evaluation has terminally failed (see evaluationFailed below) —
  // the 404-retry loop would otherwise burn its full 60 attempts (~3 min)
  // for nothing.
  const evaluationUnavailable = finishResult?.status === "abandoned";
  const { data: gapReport, isPending: gapReportPending } = useGapReport(
    finishResult && finishResult.status !== "failed" && !evaluationUnavailable
      ? sessionId
      : null,
  );

  useEffect(() => {
    if (!sessionId && resumableSession) {
      setInputMode(resumableSession.input_mode);
    }
  }, [resumableSession, sessionId]);

  // Auto-resume on reload (resilience A-Tier-1 #1). A mid-interview refresh
  // otherwise dumps the student back to the lobby with a manual "Resume" button.
  // We stamp a sessionStorage marker while the interview is live; on mount, if a
  // resumable in-progress session exists AND its marker is present (i.e. this is
  // a genuine reload of an active attempt, not a fresh lobby visit), we resume
  // automatically. sessionStorage survives reload but not tab-close, so a fresh
  // navigation still shows the lobby + Resume button (never surprises the user).
  const ACTIVE_MARKER_KEY = `abridge:iv-active:${configId}`;
  const autoResumeTriedRef = useRef(false);
  useEffect(() => {
    // Stamp / clear the "live attempt" marker as the session goes active/ends.
    try {
      if (sessionId && phase !== "prestart" && phase !== "results") {
        window.sessionStorage.setItem(ACTIVE_MARKER_KEY, sessionId);
      } else if (phase === "results") {
        window.sessionStorage.removeItem(ACTIVE_MARKER_KEY);
      }
    } catch {
      /* storage unavailable — auto-resume is best-effort */
    }
  }, [sessionId, phase, ACTIVE_MARKER_KEY]);

  useEffect(() => {
    if (autoResumeTriedRef.current) return;
    if (sessionId || !resumableSession || previousSessionsLoading) return;
    let marker: string | null = null;
    try {
      marker = window.sessionStorage.getItem(ACTIVE_MARKER_KEY);
    } catch {
      marker = null;
    }
    // Only auto-resume a genuine reload of THIS live attempt.
    if (marker !== resumableSession.session_id) return;
    autoResumeTriedRef.current = true;
    void handleStart();
    // handleStart is a stable declaration read at call time; resumableSession /
    // loading are the real triggers. Guarded by the ref so it fires once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumableSession, sessionId, previousSessionsLoading, ACTIVE_MARKER_KEY]);

  // The pass/fail verdict is produced by an async worker (~1-2 min) AFTER
  // /finish returns. At finish time pass_verdict is still null, so we must NOT
  // render it as a fail. Poll the session until the verdict resolves, then stop.
  //
  // The AI judge (LLM call) can fail outright (provider outage, malformed
  // JSON after retries, quota exhausted, ...). The backend retries the job
  // up to 3 times (ARQ max_tries), then stamps InterviewSession.status =
  // 'failed' on the final attempt. Without checking for that terminal
  // status here, this poll would keep asking for a pass_verdict that will
  // never arrive and the student would wait forever.
  const finishVerdict = finishResult?.pass_verdict ?? null;
  const evaluationTerminallyFailed = finishResult?.status === "failed" || false;
  const { data: verdictPoll } = useInterviewSession(
    finishResult &&
      finishVerdict === null &&
      !evaluationTerminallyFailed &&
      !evaluationUnavailable
      ? sessionId
      : null,
    { refetchInterval: 3000 },
  );
  // Live verdict: prefer the polled value once it lands, else the finish value.
  const liveVerdict: boolean | null =
    verdictPoll?.pass_verdict ?? finishVerdict;
  const evaluationFailed =
    evaluationTerminallyFailed || verdictPoll?.status === "failed";
  const verdictPending =
    !!finishResult &&
    liveVerdict === null &&
    !evaluationFailed &&
    !evaluationUnavailable;

  // Once the polled verdict resolves OR the evaluation terminally fails,
  // freeze it into finishResult so the poll's `enabled` flips to false
  // (finishVerdict/status are otherwise the frozen values from the /finish
  // response and would keep the poll running forever).
  useEffect(() => {
    if (!verdictPoll) return;
    const resolved = verdictPoll.pass_verdict;
    const failed = verdictPoll.status === "failed";
    if ((resolved !== null && resolved !== undefined) || failed) {
      setFinishResult((prev) =>
        prev && prev.pass_verdict === null && prev.status !== "failed"
          ? { ...prev, pass_verdict: resolved, status: verdictPoll.status }
          : prev,
      );
    }
  }, [verdictPoll]);

  // Poll session status (every 2s) when voice completes to detect the
  // server-side finish. TanStack Query does not poll by default, so the
  // refetchInterval is required — without it the status is fetched once and
  // the user can hang forever if the commit lands a moment later.
  const { data: sessionStatus } = useInterviewSession(
    pollingCompletion ? sessionId : null,
    { refetchInterval: 2000 },
  );

  // Stop polling on ANY terminal status (completed/timed_out/abandoned/failed)
  // and surface the result. Scores/verdict are produced by the async
  // evaluation and appear via the gap report (same as text mode).
  useEffect(() => {
    if (!pollingCompletion || !sessionStatus) return;
    const terminal = ["completed", "timed_out", "abandoned", "failed"];
    if (terminal.includes(sessionStatus.status)) {
      setPollingCompletion(false);
      setPhase("results");
      setFinishResult({
        session_id: sessionStatus.session_id,
        status: sessionStatus.status,
        pass_verdict: sessionStatus.pass_verdict ?? null,
        total_score: null,
        rubric_scores: [],
      });
    }
  }, [pollingCompletion, sessionStatus]);

  const supportedModes = useMemo(() => {
    if (!config) return ["text" as const];
    const mode = config.supported_modes;
    return mode === "hybrid" ? (["text", "voice"] as const) : ([mode] as const);
  }, [config]);

  useEffect(() => {
    if (!config) return;
    if (config.supported_modes === "voice") setInputMode("voice");
    else if (config.supported_modes === "text") setInputMode("text");
    else setInputMode("hybrid");
  }, [config]);

  // A hybrid config runs a single text-driven session where each answer can be
  // TYPED or SPOKEN (browser speech-to-text fills the answer, submitted via the
  // same REST /respond path). This is distinct from the server-side LiveKit
  // voice agent, which is only used when the student explicitly picks "voice".
  const isHybrid = config?.supported_modes === "hybrid";

  // Speech-to-text dictation for hybrid answers. Finalized chunks are appended
  // to the current answer draft (with a separating space) so the student can
  // dictate, then edit before sending.
  const dictationLang = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";
  const dictation = useSpeechDictation({
    lang: dictationLang,
    onResult: (finalText) =>
      setAnswerText((prev) =>
        prev.trim().length > 0 ? `${prev.trim()} ${finalText}` : finalText,
      ),
  });
  // Stop dictation whenever the question changes or the answer is sent.
  useEffect(() => {
    if (dictation.listening) dictation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id, onboardingStage]);

  // The AI "speaks" each question aloud while it types out on screen (see
  // AiTypingMessage). Server-side TTS (same voice as the LiveKit agent) with a
  // browser-TTS fallback. Student-toggleable so it can be silenced.
  const [voiceOn, setVoiceOn] = useState(true);
  const speakLang = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";
  // Persona drives the voice selection (server-side) so a "strict" interview
  // sounds firmer and a "supportive" one warmer. Falls back to neutral when
  // the config has no persona set.
  const speakPersona: SpeechPersona =
    config?.persona === "strict" || config?.persona === "supportive"
      ? config.persona
      : "neutral";
  const narration = useInterviewNarration({
    sessionId,
    persona: speakPersona,
    lang: speakLang,
  });
  const speakIfOn = useCallback(
    (text: string) => {
      if (voiceOn) return narration.narrate(text);
      return { started: Promise.resolve(), finished: Promise.resolve() };
    },
    [voiceOn, narration],
  );
  // Silence any in-flight speech the moment the student mutes.
  useEffect(() => {
    if (!voiceOn) narration.cancel();
  }, [voiceOn, narration]);

  // Id of the most recently-added AI turn — only this one animates (types) and
  // speaks. Earlier AI turns render their full text immediately and silently.
  const elapsed = useInterviewTimer(
    assessmentStartedAtMs !== null &&
      phase !== "closing" &&
      phase !== "results",
    assessmentStartedAtMs,
  );
  const currentQuestionNumber = useMemo(() => {
    const questionIds = new Set(
      transcript
        .filter((turn) => turn.kind === "question")
        .map((turn) => turn.id),
    );
    return Math.max(1, questionIds.size);
  }, [transcript]);
  // The public learner API intentionally reveals questions one at a time and
  // currently does not expose a total. The header/card render an honest
  // indeterminate fallback until that existing nullable field is populated.
  const totalQuestions: number | null = null;
  const dictationHasError = Boolean(
    dictation.error && dictation.error !== "unsupported",
  );
  const agentStatus: InterviewAgentStatus = resolveInterviewState({
    connected,
    hasError: respond.isError || onboarding.isError || dictationHasError,
    thinking: respond.isPending || onboarding.isPending,
    speaking: aiSpeaking,
    listening: dictation.listening,
    paused: dictation.paused,
  });

  function handleStartSuccess(
    payload: InterviewSessionStartResponse,
    voiceSession = false,
  ) {
    const stage = payload.onboarding_stage ?? "completed";
    const restoredTranscript = (payload.history ?? []).map(restoreHistoryTurn);
    voiceInitialTranscriptRef.current = restoredTranscript;
    if (stage === "completed" && !payload.first_question) {
      toast.error(t("course_interview.errors.no_question_available"));
      setSessionId(null);
      setCurrentQuestion(null);
      setTranscript([]);
      sessionStartedAtRef.current = null;
      setAssessmentStartedAtMs(null);
      sessionDeadlineAtRef.current = null;
      setPhase("prestart");
      return;
    }
    const language = payload.interview_language ?? interviewLanguage;
    setInterviewLanguage(language);
    void i18n.changeLanguage(language);
    setOnboardingStage(stage);
    timeoutTriggeredRef.current = false;
    setVoiceOn(true);
    setTranscriptOpen(false);
    setConnected(true);
    setSessionId(payload.session_id);
    setPendingFirstQuestion(null);

    if (stage === "completed" && payload.first_question) {
      const assessmentStart = payload.assessment_started_at
        ? new Date(payload.assessment_started_at).getTime()
        : Date.now();
      sessionStartedAtRef.current = assessmentStart;
      setAssessmentStartedAtMs(assessmentStart);
      sessionDeadlineAtRef.current =
        payload.time_remaining_seconds == null
          ? null
          : Date.now() + payload.time_remaining_seconds * 1000;
      setPhase("questioning");
      setCurrentQuestion(payload.first_question);
      setTranscript(
        restoredTranscript.length > 0
          ? restoredTranscript
          : voiceSession
            ? []
            : [makeAiTurn(payload.first_question, false, 0)],
      );
      if (voiceSession) setVoiceActive(true);
    } else {
      sessionStartedAtRef.current = null;
      setAssessmentStartedAtMs(null);
      sessionDeadlineAtRef.current = null;
      setCurrentQuestion(null);
      setPhase(stage === "readiness" ? "readiness" : "opening");
      setTranscript(
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

  async function handleStart() {
    const isVoice = inputMode === "voice";

    if (isVoice) {
      const granted = await checkMicPermission();
      if (!granted) {
        toast.error(
          "Microphone access denied. Falling back to text interview.",
        );
        setInputMode("text");
        // Fall through to start a text session
        try {
          const payload = await startSession.mutateAsync({
            input_mode: "text",
          });
          handleStartSuccess(payload);
        } catch (err) {
          toast.error(
            err instanceof ApiError && err.status === 429
              ? t("course_interview.errors.rate_limited")
              : t("course_interview.errors.start_failed"),
          );
        }
        return;
      }
    }

    try {
      const payload = await startSession.mutateAsync({ input_mode: inputMode });
      handleStartSuccess(payload, isVoice);
      // Only enter voice mode when handleStartSuccess actually committed to a
      // session — i.e. the backend returned a first question. When it didn't
      // (e.g. config published with only pending questions), the toast in
      // handleStartSuccess already informed the user; staying on the
      // mode-selection screen lets them retry without joining an empty room.
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.status === 429
          ? t("course_interview.errors.rate_limited")
          : t("course_interview.errors.start_failed"),
      );
    }
  }

  async function handleOnboarding(
    action?: InterviewOnboardingAction,
    languageOverride?: InterviewLanguage,
    nameOverride?: string,
  ) {
    if (!sessionId || onboardingStage === "completed") return;
    const pendingInterim = dictation.listening ? dictation.stop() : "";
    const naturalText = [answerText.trim(), pendingInterim]
      .filter(Boolean)
      .join(" ")
      .trim();
    const guidedText = action
      ? t(`course_interview.onboarding.action_messages.${action}`, {
          lng: languageOverride ?? interviewLanguage,
        })
      : "";
    // set_name carries the candidate's typed name verbatim as the response
    // text; the backend persists it as the session-scoped preferred name.
    const submittedText =
      action === "set_name" && nameOverride?.trim()
        ? nameOverride.trim()
        : naturalText || guidedText;
    if (!submittedText) {
      toast.error(t("course_interview.onboarding.response_required"));
      return;
    }

    const turnKey = newTurnKey();
    setTranscript((previous) => [
      ...previous,
      makeUserTurn(submittedText, turnKey),
    ]);
    setAnswerText("");

    try {
      const result = await onboarding.mutateAsync({
        stage: onboardingStage,
        response_text: submittedText,
        action,
        language: languageOverride ?? interviewLanguage,
        turn_key: turnKey,
      });
      setInterviewLanguage(result.interview_language);
      void i18n.changeLanguage(result.interview_language);
      setOnboardingStage(result.onboarding_stage);

      if (result.ai_text) {
        setTranscript((previous) => [
          ...previous,
          makeCeremonyTurn(
            result.is_complete
              ? "transition"
              : result.onboarding_stage === "readiness"
                ? "briefing"
                : "opening",
            result.ai_text!,
            `${sessionId}-${turnKey}`,
            result.is_complete ? 0 : undefined,
          ),
        ]);
      }

      if (result.is_complete) {
        if (!result.first_question) {
          toast.error(t("course_interview.errors.no_question_available"));
          return;
        }
        const assessmentStart = result.assessment_started_at
          ? new Date(result.assessment_started_at).getTime()
          : Date.now();
        sessionStartedAtRef.current = assessmentStart;
        setAssessmentStartedAtMs(assessmentStart);
        sessionDeadlineAtRef.current =
          result.time_remaining_seconds == null
            ? null
            : Date.now() + result.time_remaining_seconds * 1000;
        timeoutTriggeredRef.current = false;
        setPendingFirstQuestion(result.first_question);
        setPhase("transition");
      } else {
        setPhase(
          result.onboarding_stage === "readiness" ? "readiness" : "opening",
        );
      }
    } catch (error) {
      setTranscript((previous) =>
        previous.filter((turn) => turn.id !== `a-${turnKey}`),
      );
      setAnswerText(naturalText);
      toast.error(
        (error as Error).message ||
          t("course_interview.onboarding.send_failed"),
      );
    }
  }

  const beginClosing = useCallback(
    async (reason: FinishReason) => {
      if (!sessionId || phase === "closing" || phase === "results") return;
      if (dictation.listening) dictation.stop();
      narration.cancel();
      const closingElapsedSeconds = currentElapsedSeconds();
      setAnswerText("");
      setEndDialogOpen(false);
      setAiSpeaking(false);
      setPhase("closing");

      try {
        const result = await finish.mutateAsync({ reason });
        setCurrentQuestion(null);
        setPendingFirstQuestion(null);
        setPendingFinishResult(result);
        if (result.closing_text) {
          setTranscript((previous) => [
            ...previous.filter((turn) => turn.kind !== "closing"),
            makeCeremonyTurn(
              "closing",
              result.closing_text!,
              sessionId,
              closingElapsedSeconds,
            ),
          ]);
        } else {
          setPhase("results");
          setFinishResult(result);
          setPendingFinishResult(null);
        }
      } catch (error) {
        setPhase("questioning");
        toast.error(
          (error as Error).message ||
            t("course_interview.errors.finish_failed"),
        );
      }
    },
    // The dictation/narration methods are stable and are intentionally read at
    // call time; including their wrapper objects would restart timeout effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionId, phase, finish, t],
  );

  /** Agent departure is natural completion; the call button is an early end. */
  function handleVoiceCompleted(reason: "natural" | "ended_early") {
    setVoiceActive(false);
    if (reason === "ended_early") {
      void beginClosing("ended_early");
      return;
    }
    if (sessionId) {
      finish.mutate({ reason: "natural" }, { onError: () => undefined });
    }
    setPollingCompletion(true);
  }

  /**
   * Voice room dropped for a transient reason (network / server), NOT a natural
   * end (resilience A-Tier-1 #3). Do NOT finalize+grade the session. Tear down
   * the room, switch the live session to text, restore the transcript captured
   * so far, and resume questioning in place so the student keeps going instead
   * of losing a graded attempt to a blip.
   */
  async function handleVoiceDropped() {
    setVoiceActive(false);
    setInputMode("text");
    toast.warning(t("course_interview.voice.dropped_fallback_text"));
    // Re-enter via the idempotent start path in TEXT mode: it returns the SAME
    // in-progress session with full history + the current question, so the
    // student resumes exactly where the voice room dropped — no finalize, no
    // lost turns. (start_session is idempotent for a live session.) We call the
    // mutation directly with input_mode:"text" rather than handleStart() because
    // the setInputMode above hasn't flushed yet — handleStart's closure would
    // still read the stale "voice" mode and re-enter the room.
    try {
      const payload = await startSession.mutateAsync({ input_mode: "text" });
      handleStartSuccess(payload);
    } catch {
      toast.error(t("course_interview.errors.start_failed"));
    }
  }

  const handleTurnPresented = useCallback(
    (turn: ConversationTurn) => {
      if (
        turn.kind === "transition" &&
        phase === "transition" &&
        pendingFirstQuestion
      ) {
        const question = pendingFirstQuestion;
        setCurrentQuestion(question);
        setPendingFirstQuestion(null);
        setPhase("questioning");
        if (inputMode === "voice") {
          setVoiceActive(true);
        } else {
          setTranscript((previous) => [
            ...previous,
            makeAiTurn(question, false, currentElapsedSeconds()),
          ]);
        }
        return;
      }
      // Mid-interview advance: the transition finished presenting/narrating, so
      // now reveal the held next Question Card (spec §Frontend Sequencing —
      // the card never appears at the same time as its transition).
      if (
        turn.kind === "transition" &&
        phase === "transition" &&
        pendingNextQuestion
      ) {
        const question = pendingNextQuestion;
        setPendingNextQuestion(null);
        setCurrentQuestion(question);
        setPhase("questioning");
        if (inputMode !== "voice") {
          setTranscript((previous) => [
            ...previous,
            makeAiTurn(question, false, currentElapsedSeconds()),
          ]);
        }
        return;
      }
      // Final-question transition finished: now run the existing finish flow so
      // the separate goodbye follows (spec §ending — two short turns).
      if (
        turn.kind === "transition" &&
        phase === "transition" &&
        pendingFinalTransition
      ) {
        setPendingFinalTransition(false);
        void beginClosing("natural");
        return;
      }
      if (
        turn.kind === "closing" &&
        phase === "closing" &&
        pendingFinishResult
      ) {
        setPhase("results");
        setFinishResult(pendingFinishResult);
        setPendingFinishResult(null);
      }
    },
    [
      inputMode,
      pendingFinishResult,
      pendingFirstQuestion,
      pendingNextQuestion,
      pendingFinalTransition,
      beginClosing,
      phase,
    ],
  );

  useEffect(() => {
    const deadline = sessionDeadlineAtRef.current;
    if (
      !sessionId ||
      deadline === null ||
      phase === "closing" ||
      phase === "results" ||
      timeoutTriggeredRef.current
    ) {
      return;
    }
    const trigger = () => {
      if (timeoutTriggeredRef.current) return;
      timeoutTriggeredRef.current = true;
      setVoiceActive(false);
      void beginClosing("timed_out");
    };
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      trigger();
      return;
    }
    const timer = window.setTimeout(trigger, remaining);
    return () => window.clearTimeout(timer);
  }, [beginClosing, phase, sessionId]);

  /**
   * Assistance turns (clarify / hint / explain-term) are NOT the candidate's
   * answer — they keep the original optimistic-append behaviour and never touch
   * the answer-submission state machine. Only a real "answer" turn drives the
   * draft→submitting→submitted/failed lifecycle (see handleRespond).
   */
  async function handleAssistance(
    requestText: string,
    turnAction: Exclude<InterviewTurnAction, "answer">,
    displayText: string,
  ) {
    if (!currentQuestion || !sessionId || respond.isPending) return;
    const trimmed = requestText.trim();
    if (!trimmed) return;

    const userTurnKey = `${currentQuestion.id}-${Date.now()}`;
    const localTurnKind = turnAction === "hint" ? "hint" : "clarification";
    setTranscript((prev) => [
      ...prev,
      makeUserTurn(
        displayText,
        userTurnKey,
        currentElapsedSeconds(),
        localTurnKind,
      ),
    ]);

    try {
      const result = await respond.mutateAsync({
        session_id: sessionId,
        session_question_id: currentQuestion.id,
        answer_text: trimmed,
        turn_action: turnAction,
        turn_key: newTurnKey(),
      });

      reconcileDeadline(result.time_remaining_seconds);

      const finished = Boolean(result.should_finish ?? result.is_finished);
      const standaloneText =
        result.ai_turn_text || result.ai_followup_text || null;

      if (standaloneText && !finished) {
        const assistanceTurnKind =
          result.assistance_kind === "hint"
            ? "hint"
            : result.assistance_kind === "clarification" ||
                result.assistance_kind === "term"
              ? "clarification"
              : "followup";
        if (result.assistance_kind) {
          setTranscript((previous) =>
            previous.map((turn) =>
              turn.id === `a-${userTurnKey}`
                ? { ...turn, kind: assistanceTurnKind }
                : turn,
            ),
          );
        }
        setTranscript((prev) => [
          ...prev,
          makeFollowUpTurn(
            standaloneText,
            `${userTurnKey}-fu`,
            currentElapsedSeconds(),
            assistanceTurnKind,
          ),
        ]);
      }

      if (finished) {
        await beginClosing("natural");
        return;
      }
      if (result.next_question) {
        setCurrentQuestion(result.next_question);
        setTranscript((prev) => [
          ...prev,
          makeAiTurn(result.next_question!, false, currentElapsedSeconds()),
        ]);
      }
    } catch (err) {
      setTranscript((previous) =>
        previous.filter((turn) => turn.id !== `a-${userTurnKey}`),
      );
      if (err instanceof ApiError && err.status === 429) {
        toast.error(t("course_interview.errors.rate_limited"));
      } else {
        toast.error(
          (err as Error).message || t("course_interview.errors.send_failed"),
        );
      }
    }
  }

  /**
   * Submit the candidate's answer through the structured lifecycle (spec §2/§7):
   *
   *  1. `submitting`  — draft preserved, submit disabled, one submission only.
   *  2. `submitted`   — ONLY after the server acknowledges: the answer is added
   *     to the transcript exactly once (deduped by submissionId), the compact
   *     confirmation replaces the editor, and the draft is cleared.
   *  3. `failed`      — the draft is preserved and retry is exposed; no
   *     transcript entry, no question advance, timer/question untouched.
   *
   * `retrySubmissionId` reuses the prior idempotency key so a retry after a
   * failure cannot create a duplicate transcript entry server- or client-side.
   */
  async function handleRespond(
    answerOverride?: string,
    options: { retrySubmissionId?: string } = {},
  ) {
    if (!currentQuestion || !sessionId || respond.isPending) return;
    // Guard against duplicate submissions from the state machine itself.
    if (
      answer.state.status === "submitting" ||
      answer.state.status === "submitted"
    ) {
      return;
    }
    const pendingInterim = dictation.listening ? dictation.stop() : "";
    const sourceText = answerOverride ?? answerText;
    const trimmed = [sourceText.trim(), pendingInterim]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (!trimmed) {
      toast.error(t("course_interview.errors.answer_required"));
      return;
    }

    const questionId = currentQuestion.id;
    // Stable submission id doubles as the transcript turn id and the server
    // idempotency key, so a retry reuses it and never double-inserts.
    const submissionId = options.retrySubmissionId ?? newTurnKey();
    beginSubmit(submissionId, trimmed);

    try {
      const result = await respond.mutateAsync({
        session_id: sessionId,
        session_question_id: questionId,
        answer_text: trimmed,
        turn_action: "answer",
        // Idempotency key so a network retry never double-inserts the answer
        // or re-runs the adaptive pipeline (adaptive safeguard #1). Legacy
        // backend ignores it harmlessly.
        turn_key: submissionId,
      });

      // Re-anchor the timeout to the server's authoritative countdown (#4).
      reconcileDeadline(result.time_remaining_seconds);

      // End-confirmation gate (Slice 4): the backend recognised this as a
      // natural-language end request and is asking the candidate to confirm
      // rather than closing. It is NOT an answer — roll the editor back to a
      // preserved draft (no transcript entry, no advance), and surface the
      // Continue / End-and-submit controls. The question + timer stay intact.
      if (isAwaitingEndConfirmation(result)) {
        restoreDraft(trimmed);
        setAnswerText(trimmed);
        setEndConfirmPrompt(
          endConfirmationPrompt(
            result,
            t("course_interview.end_confirm.prompt"),
          ),
        );
        setEndConfirming(true);
        return;
      }

      // Server acknowledged — NOW commit to the transcript (spec: add only
      // after successful backend acknowledgement), deduped by submissionId so
      // a retry that reuses the id can't create a second entry.
      const answerTurnId = `a-${submissionId}`;
      setTranscript((prev) =>
        prev.some((turn) => turn.id === answerTurnId)
          ? prev
          : [
              ...prev,
              makeUserTurn(
                trimmed,
                submissionId,
                currentElapsedSeconds(),
                "answer",
              ),
            ],
      );
      submitSucceeded(trimmed);
      // The answer is committed server-side — drop its autosaved draft (#2).
      clearDraftAutosave();
      // Editor content is cleared ONLY after the server acknowledged (spec §2);
      // the compact confirmation now stands in for the answer on the main screen.
      setAnswerText("");
      setRecentSubmission({ answer: trimmed, questionId, submissionId });

      const isAdvance = Boolean(result.next_question);
      const finished = Boolean(result.should_finish ?? result.is_finished);
      const standaloneText =
        !isAdvance && (result.ai_turn_text || result.ai_followup_text)
          ? result.ai_turn_text || result.ai_followup_text!
          : result.ai_followup_text || null;

      if (standaloneText && !finished) {
        const closing = isClosingTurn(result);
        if (closing) {
          // Rich-closing sub-step (self-reflection / invite-questions): NON-
          // assessed ceremony. Tag it `kind: "closing"` so the transcript
          // groups it under a "Wrap-up" section (never "Question N"), and flag
          // the ceremony so the composer offers a Skip-and-finish control.
          setTranscript((prev) => [
            ...prev,
            {
              id: `c-${submissionId}`,
              role: "ai",
              text: standaloneText,
              elapsedSeconds: currentElapsedSeconds(),
              kind: "closing",
            },
          ]);
          setClosingCeremonyActive(true);
          reopenForFollowUp();
        } else {
          const assistanceTurnKind =
            result.assistance_kind === "hint"
              ? "hint"
              : result.assistance_kind === "clarification" ||
                  result.assistance_kind === "term"
                ? "clarification"
                : "followup";
          setTranscript((prev) => [
            ...prev,
            makeFollowUpTurn(
              standaloneText,
              `${submissionId}-fu`,
              currentElapsedSeconds(),
              assistanceTurnKind,
            ),
          ]);
          // A probe/clarification on the SAME question re-opens the answer so
          // the candidate can respond again; the confirmation collapses to
          // "previous".
          if (!isAdvance) reopenForFollowUp();
        }
      }

      // Decide the transition to present (spec §Frontend Sequencing + §ending).
      // Pure helper keeps the sequencing rules unit-testable and identical to
      // what ships. A null plan on a finished turn means no transition text was
      // available → close immediately (mixed-version safety).
      const plan = planTransition(
        result,
        t("course_interview.transitions.next_question"),
      );

      if (finished) {
        if (plan && plan.target === "closing") {
          // Final-question transition first; handleTurnPresented then runs the
          // existing finish flow so the separate goodbye follows (two turns).
          setPhase("transition");
          setPendingFinalTransition(true);
          setTranscript((prev) => [
            ...prev,
            makeCeremonyTurn(
              "transition",
              plan.text,
              `${submissionId}-final`,
              currentElapsedSeconds(),
            ),
          ]);
          return;
        }
        await beginClosing("natural");
        return;
      }

      if (result.next_question && plan && plan.target === "next_question") {
        // Show + narrate the transition, hold the next Question Card in
        // pendingNextQuestion, and keep the composer hidden (phase="transition")
        // until the transition finishes presenting (handleTurnPresented reveals
        // the card — it never appears alongside its transition).
        setPendingNextQuestion(result.next_question);
        setPhase("transition");
        setTranscript((prev) => [
          ...prev,
          makeCeremonyTurn(
            "transition",
            plan.text,
            `${submissionId}-transition`,
            currentElapsedSeconds(),
          ),
        ]);
      }
    } catch (err) {
      // Preserve the draft and expose retry (spec §3). No transcript entry was
      // added, the question/timer are untouched, and we do NOT advance.
      submitFailed(
        err instanceof ApiError && err.status === 429
          ? t("course_interview.errors.rate_limited")
          : (err as Error).message || t("course_interview.errors.send_failed"),
      );
      setAnswerText(trimmed);
      if (err instanceof ApiError && err.status === 429) {
        toast.error(t("course_interview.errors.rate_limited"));
      } else {
        toast.error(
          (err as Error).message || t("course_interview.errors.send_failed"),
        );
      }
    }
  }

  /**
   * End-confirmation gate (Slice 4) — the candidate answered the "end and
   * submit, or continue?" prompt via the explicit controls. Both send a canned
   * reply the backend's confirmation-scoped classifier recognises, through the
   * same `respond` mutation and turn-key idempotency as any other turn.
   */
  async function handleEndConfirm() {
    if (!currentQuestion || !sessionId || respond.isPending) return;
    try {
      const result = await respond.mutateAsync({
        session_id: sessionId,
        session_question_id: currentQuestion.id,
        answer_text: CONFIRM_END_REPLY,
        turn_action: "answer",
        turn_key: newTurnKey(),
      });
      setEndConfirming(false);
      setEndConfirmPrompt("");
      const finished = Boolean(result.should_finish ?? result.is_finished);
      // Confirmed → the backend closes; run the existing finish flow.
      if (finished || !isAwaitingEndConfirmation(result)) {
        await beginClosing("ended_early");
      }
    } catch (err) {
      toast.error(
        (err as Error).message || t("course_interview.errors.send_failed"),
      );
    }
  }

  async function handleEndCancel() {
    if (!currentQuestion || !sessionId || respond.isPending) return;
    try {
      await respond.mutateAsync({
        session_id: sessionId,
        session_question_id: currentQuestion.id,
        answer_text: CANCEL_END_REPLY,
        turn_action: "answer",
        turn_key: newTurnKey(),
      });
    } catch {
      // Even if the cancel round-trip fails, locally returning to the question
      // is the safe default (the backend treats a non-confirm while pending as
      // a cancel, and never advanced/scored). Surface nothing disruptive.
    } finally {
      // Return to the current question; the preserved draft is already restored.
      setEndConfirming(false);
      setEndConfirmPrompt("");
    }
  }

  function stayInInterview() {
    if (leaveBlocker.status === "blocked") leaveBlocker.reset();
  }

  function leaveInterviewOpen() {
    if (leaveBlocker.status !== "blocked") return;
    if (dictation.listening) dictation.stop();
    narration.cancel();
    leaveBlocker.proceed();
  }

  const leaveInterviewDialog = (
    <LeaveInterviewDialog
      open={leaveBlocker.status === "blocked"}
      onStay={stayInInterview}
      onLeave={leaveInterviewOpen}
      assessmentStarted={assessmentStartedAtMs !== null}
      hasTimeLimit={Boolean(config?.time_limit_minutes)}
    />
  );

  // ── Loading state ──────────────────────────────────────────────────────────
  if (courseLoading || configLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="space-y-3 w-full max-w-sm">
          <div className="h-4 rounded-full bg-m3-surface-container animate-pulse" />
          <div className="h-4 rounded-full bg-m3-surface-container animate-pulse w-4/5" />
          <div className="h-32 rounded-xl bg-m3-surface-container animate-pulse mt-6" />
        </div>
      </div>
    );
  }

  if (!course || !config) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-8">
        <GlassCard className="p-10 text-center max-w-md">
          <Bot className="h-10 w-10 text-m3-outline mx-auto mb-4" />
          <h2 className="font-headline font-bold text-xl text-m3-on-surface mb-2">
            {t("course_interview.empty_states.no_interview_found")}
          </h2>
          <p className="text-sm text-m3-on-surface-variant mb-6">
            {t("course_interview.empty_states.config_not_loadable")}
          </p>
          <Link to="/courses/$slug/learn" params={{ slug }}>
            <Button className="gradient-primary text-white rounded-xl font-bold gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t("course_interview.actions.back_to_course")}
            </Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  // ── Results screen (text mode finish OR voice mode completion) ─────────────
  if (finishResult) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 sm:p-8">
        <div className="max-w-3xl w-full space-y-6">
          <GlassCard className="p-8 sm:p-10 text-center">
            <div
              className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl font-black font-headline shadow-lg",
                evaluationFailed
                  ? "bg-gradient-to-br from-danger to-red-600 text-white"
                  : evaluationUnavailable
                    ? "bg-m3-surface-container text-m3-on-surface-variant"
                    : verdictPending
                      ? "bg-gradient-to-br from-m3-surface-container to-m3-surface-container-high text-m3-primary"
                      : liveVerdict
                        ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
                        : "bg-gradient-to-br from-m3-primary to-m3-secondary text-white",
              )}
            >
              {evaluationFailed ? (
                "!"
              ) : evaluationUnavailable ? (
                "—"
              ) : verdictPending ? (
                <Loader2 className="h-10 w-10 animate-spin" />
              ) : liveVerdict ? (
                "✓"
              ) : (
                "—"
              )}
            </div>
            <h2 className="font-headline font-extrabold text-2xl text-m3-primary mb-1">
              {evaluationFailed
                ? t("course_interview.results.evaluation_failed")
                : evaluationUnavailable
                  ? t("course_interview.results.abandoned")
                  : verdictPending
                    ? t("course_interview.results.evaluating")
                    : liveVerdict
                      ? t("course_interview.results.passed")
                      : t("course_interview.results.completed")}
            </h2>
            <p className="text-m3-on-surface-variant text-sm mb-6">
              {evaluationFailed
                ? t("course_interview.results.evaluation_failed_summary")
                : evaluationUnavailable
                  ? t("course_interview.results.abandoned_summary")
                  : verdictPending
                    ? t("course_interview.results.evaluating_summary")
                    : liveVerdict
                      ? t("course_interview.results.pass_summary")
                      : t("course_interview.results.fail_summary")}
            </p>

            <Link to="/courses/$slug/learn" params={{ slug }}>
              <Button
                variant="outline"
                className="rounded-xl ghost-border font-bold text-sm gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("course_interview.actions.back_to_course")}
              </Button>
            </Link>
          </GlassCard>

          {finishResult &&
            !gapReport &&
            gapReportPending &&
            !evaluationFailed && (
              <GlassCard className="p-6 text-center">
                <p className="text-sm text-m3-on-surface-variant">
                  {t("course_interview.sections.gap_report_pending")}
                </p>
              </GlassCard>
            )}

          {gapReport && (
            <GlassCard className="p-6">
              <h3 className="font-headline font-bold text-m3-primary mb-3">
                {t("course_interview.sections.gap_report")}
              </h3>
              {gapReport.discrepancy_summary && (
                <p className="text-sm text-m3-on-surface-variant mb-4 leading-relaxed">
                  {gapReport.discrepancy_summary}
                </p>
              )}
              {gapReport.study_plan.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-m3-outline uppercase tracking-widest">
                    {t("course_interview.sections.study_plan")}
                  </h4>
                  <ul className="space-y-2">
                    {gapReport.study_plan.map((item, idx) => (
                      <li
                        key={idx}
                        className="rounded-xl bg-m3-surface-container-low p-3 text-sm text-m3-on-surface"
                      >
                        <span className="block font-semibold mb-0.5">
                          {item.topic}
                        </span>
                        {item.suggested_resources.length > 0 && (
                          <span className="block text-xs text-m3-on-surface-variant">
                            {item.suggested_resources.join(" • ")}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </GlassCard>
          )}
        </div>
      </div>
    );
  }

  // ── Polling / waiting for voice session to complete ────────────────────────
  if (pollingCompletion) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-8">
        <GlassCard className="p-10 text-center max-w-md">
          <Sparkles className="h-8 w-8 text-m3-primary mx-auto mb-4 animate-pulse" />
          <p className="text-sm text-m3-on-surface-variant">
            {t("course_interview.status.compiling_results")}
          </p>
        </GlassCard>
      </div>
    );
  }

  // ── Voice session active (LiveKit room) ────────────────────────────────────
  if (voiceActive && sessionId) {
    return (
      <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-white">
        <InterviewHeader
          slug={slug}
          courseName={course.title}
          interviewTitle={config.title}
          elapsed={elapsed}
          timerActive={assessmentStartedAtMs !== null}
          expectedDurationMinutes={config.time_limit_minutes}
          currentQuestion={null}
          totalQuestions={totalQuestions}
          connected={connected}
          voiceOn={voiceOn}
          onToggleVoice={() => setVoiceOn((current) => !current)}
          showVoiceControl={false}
        />
        <VoiceRoom
          sessionId={sessionId}
          elapsed={elapsed}
          initialTranscript={voiceInitialTranscriptRef.current}
          onCompleted={handleVoiceCompleted}
          onVoiceDropped={handleVoiceDropped}
          onTranscriptChange={setTranscript}
        />
        {leaveInterviewDialog}
      </div>
    );
  }

  // ── Pre-start screen (mode selection) ─────────────────────────────────────
  if (!sessionId) {
    return (
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6">
        <div className="max-w-xl w-full mx-auto space-y-4">
          {/* Back link re-anchored just above the card so it reads as part of
              the centered block rather than orphaned at the top of the page. */}
          <Link
            to="/courses/$slug/learn"
            params={{ slug }}
            className="inline-flex h-9 items-center gap-2 rounded-lg px-3 -ml-3 text-sm font-semibold text-text-muted outline-none transition-colors hover:bg-surface-muted hover:text-text-strong focus-visible:ring-2 focus-visible:ring-primary/60"
            aria-label={t("course_interview.actions.back_to_course")}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("course_interview.actions.back_to_course")}
          </Link>

          <GlassCard className="p-8 sm:p-10 text-center">
            {/* Module-context eyebrow — gives the bare title a frame of
                reference (which course / that this is an AI module interview). */}
            <div className="mb-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-m3-secondary">
              <Bot className="h-3.5 w-3.5" />
              <span>{t("course_interview.labels.ai_interview")}</span>
              {course?.title && (
                <>
                  <span className="text-m3-outline">·</span>
                  <span className="normal-case font-semibold text-m3-on-surface-variant truncate max-w-[220px]">
                    {course.title}
                  </span>
                </>
              )}
            </div>
            <h1 className="font-headline font-extrabold text-3xl text-m3-primary mb-3">
              {config.title}
            </h1>
            <p className="text-m3-on-surface-variant mb-6">
              {t("course_interview.intro.description")}
            </p>

            {/* Criteria count — a safe expectation-setting signal (count only,
                no rubric text / weights / threshold, per the learner contract). */}
            {(takingPayload?.outcome_count ?? 0) > 0 && (
              <div className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-m3-primary-fixed px-3 py-1 text-xs font-semibold text-m3-primary">
                <ListChecks className="h-3.5 w-3.5" />
                {t("course_interview.criteria.assessed_on", {
                  count: takingPayload?.outcome_count ?? 0,
                })}
              </div>
            )}

            {resumableSession && (
              <div
                className="mb-6 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary-soft p-4 text-left"
                role="status"
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-primary">
                  <History className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-text-strong">
                    {t("course_interview.resume_dialog.notice_title", {
                      attempt: resumableSession.attempt_number,
                    })}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-text-muted">
                    {t(
                      resumableSession.onboarding_stage === "completed"
                        ? config.time_limit_minutes
                          ? "course_interview.resume_dialog.assessment_notice"
                          : "course_interview.resume_dialog.untimed_assessment_notice"
                        : "course_interview.resume_dialog.onboarding_notice",
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Stat tiles — icon chip + label + value. Values share one
                consistent color/weight (the earlier design had one stat
                arbitrarily blue); a hairline border lifts them off the card. */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              <div className="flex items-center gap-3 rounded-xl bg-m3-surface-container ghost-border p-3 text-left">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m3-primary-fixed text-m3-primary">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] text-m3-on-surface-variant uppercase font-bold tracking-wider">
                    {t("course_interview.labels.persona")}
                  </span>
                  <span className="text-sm font-bold text-m3-on-surface">
                    {config.persona === "strict"
                      ? t("course_interview.values.persona.strict")
                      : config.persona === "supportive"
                        ? t("course_interview.values.persona.supportive")
                        : t("course_interview.values.persona.neutral")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-m3-surface-container ghost-border p-3 text-left">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m3-primary-fixed text-m3-primary">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] text-m3-on-surface-variant uppercase font-bold tracking-wider">
                    {t("course_interview.labels.time")}
                  </span>
                  <span className="text-sm font-bold text-m3-on-surface">
                    {config.time_limit_minutes
                      ? t("course_interview.values.time_limit_minutes", {
                          minutes: config.time_limit_minutes,
                        })
                      : t("course_interview.values.no_limit")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-m3-surface-container ghost-border p-3 text-left">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m3-primary-fixed text-m3-primary">
                  {config.max_attempts ? (
                    <History className="h-4 w-4" />
                  ) : (
                    <InfinityIcon className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] text-m3-on-surface-variant uppercase font-bold tracking-wider">
                    {t("course_interview.labels.max_attempts")}
                  </span>
                  <span className="text-sm font-bold text-m3-on-surface">
                    {config.max_attempts ??
                      t("course_interview.values.no_limit")}
                  </span>
                </div>
              </div>
            </div>

            {/* Attempt history — the learner session contract exposes verdict
                + date (no score %), so we surface a compact pass/fail list so
                the lobby is a hub, not just a start button. Hidden while a
                resumable session banner is showing to avoid double context. */}
            {!resumableSession && pastAttempts.length > 0 && (
              <div className="mb-6 rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low p-3 text-left">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant">
                  {t("course_interview.attempts.history_title")}
                </p>
                <ul className="space-y-1.5">
                  {pastAttempts.slice(0, 3).map((s) => {
                    const passed = s.pass_verdict === true;
                    const failed = s.pass_verdict === false;
                    return (
                      <li
                        key={s.session_id}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="flex items-center gap-1.5 text-m3-on-surface-variant">
                          {passed ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          ) : failed ? (
                            <XCircle className="h-3.5 w-3.5 text-danger" />
                          ) : (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-m3-outline" />
                          )}
                          {t("course_interview.attempts.attempt_n", {
                            n: s.attempt_number,
                          })}
                        </span>
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "font-semibold",
                              passed
                                ? "text-success"
                                : failed
                                  ? "text-danger"
                                  : "text-m3-on-surface-variant",
                            )}
                          >
                            {passed
                              ? t("course_interview.attempts.passed")
                              : failed
                                ? t("course_interview.attempts.not_passed")
                                : t("course_interview.attempts.in_review")}
                          </span>
                          {(s.ended_at || s.started_at) && (
                            <span className="text-m3-outline tabular-nums">
                              {new Date(
                                s.ended_at ?? s.started_at,
                              ).toLocaleDateString(
                                i18n.language?.startsWith("vi")
                                  ? "vi-VN"
                                  : "en-US",
                                { month: "short", day: "numeric" },
                              )}
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {!resumableSession && isHybrid && (
              <div className="flex items-center justify-center gap-2 mb-6 text-xs text-m3-on-surface-variant">
                <Mic className="h-3.5 w-3.5 text-m3-primary" />
                {t("course_interview.hybrid.prestart_hint")}
              </div>
            )}

            {!resumableSession && !isHybrid && supportedModes.length > 1 && (
              <div className="flex items-center justify-center gap-2 mb-6">
                {supportedModes.map((mode) => (
                  <Button
                    key={mode}
                    variant={inputMode === mode ? "default" : "outline"}
                    onClick={() => setInputMode(mode)}
                    className={cn(
                      "rounded-xl font-bold text-xs gap-2",
                      inputMode === mode && "gradient-primary text-white",
                    )}
                  >
                    {mode === "voice" ? (
                      <Mic className="h-3 w-3" />
                    ) : (
                      <MicOff className="h-3 w-3" />
                    )}
                    {mode === "voice"
                      ? t("course_interview.values.mode.voice")
                      : t("course_interview.values.mode.text")}
                  </Button>
                ))}
              </div>
            )}

            <Button
              onClick={() => setStartDialogOpen(true)}
              disabled={startSession.isPending || previousSessionsLoading}
              className="gradient-primary text-white rounded-xl font-bold gap-2 px-8 py-3 h-auto"
            >
              {startSession.isPending || previousSessionsLoading
                ? t("course_interview.actions.starting")
                : resumableSession
                  ? t("course_interview.resume_dialog.continue")
                  : inputMode === "voice"
                    ? "Start voice interview"
                    : t("course_interview.actions.start")}
              {resumableSession ? (
                <History className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </Button>
          </GlassCard>
        </div>

        <StartInterviewDialog
          open={startDialogOpen}
          onOpenChange={(open) => {
            if (startSession.isPending && !open) return;
            setStartDialogOpen(open);
          }}
          onConfirm={() => void handleStart()}
          isPending={startSession.isPending}
          isResume={Boolean(resumableSession)}
        />
      </div>
    );
  }

  // ── Text mode chat UI ──────────────────────────────────────────────────────
  // Open the transcript (docked panel on desktop, Sheet on mobile) at the full
  // submitted answer.
  const openTranscript = () => setTranscriptOpen(true);

  // Compact main-screen confirmation for the most recent answer (spec §2/§8).
  // One card, three shapes, never conflicting: failed (draft preserved + retry),
  // submitted (preview + view full), or the collapsed "previous" acknowledgement
  // once the answer is no longer the active one (next question / follow-up).
  const answerStatus = answer.state;
  const isCurrentSubmitted =
    answerStatus.status === "submitted" &&
    recentSubmission?.questionId === currentQuestion?.id;
  const submissionSlot =
    phase !== "questioning" ? null : endConfirming ? (
      <EndConfirmationPanel
        prompt={endConfirmPrompt}
        onContinue={() => void handleEndCancel()}
        onEndAndSubmit={() => void handleEndConfirm()}
        isPending={respond.isPending}
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
          void handleRespond(answerStatus.draft, {
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

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-white">
      <InterviewHeader
        slug={slug}
        courseName={course.title}
        interviewTitle={config.title}
        elapsed={elapsed}
        timerActive={assessmentStartedAtMs !== null}
        expectedDurationMinutes={config.time_limit_minutes}
        currentQuestion={phase === "questioning" ? currentQuestionNumber : null}
        totalQuestions={totalQuestions}
        connected={connected}
        voiceOn={voiceOn}
        onToggleVoice={() =>
          setVoiceOn((current) => {
            if (current) setAiSpeaking(false);
            return !current;
          })
        }
        onEndInterview={() => setEndDialogOpen(true)}
      />

      {/* Coarse step indicator: Setup → Interview → Completed (spec §4). */}
      <div className="shrink-0 border-b border-border bg-white/95">
        <div className="mx-auto flex max-w-[1120px] items-center justify-center px-3 py-2 sm:px-6">
          <InterviewProgressSteps current={interviewStep} />
        </div>
      </div>

      {!connected && (
        <div className="mx-auto w-full max-w-[840px] px-4 pt-3">
          <ConnectionLostBanner
            onRetry={() => setConnected(navigator.onLine)}
          />
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          <FocusedInterviewStage
            transcript={transcript}
            status={agentStatus}
            transcriptOpen={transcriptOpen}
            onTranscriptOpenChange={setTranscriptOpen}
            submissionSlot={submissionSlot}
            transcriptDocked
            assessmentActive={phase === "questioning"}
            currentQuestionNumber={currentQuestionNumber}
            totalQuestions={totalQuestions}
            currentQuestionType={currentQuestion?.question_type}
            isUserTyping={
              !respond.isPending &&
              !onboarding.isPending &&
              (answerText.trim().length > 0 ||
                dictation.interim.trim().length > 0)
            }
            questionTypeLabel={(type) => questionTypeLabel(type, t)}
            speak={speakIfOn}
            onSpeakingChange={(speaking) => setAiSpeaking(voiceOn && speaking)}
            onTurnPresented={handleTurnPresented}
            onClarifyQuestion={
              phase === "questioning"
                ? () =>
                    void handleAssistance(
                      t("course_interview.workspace.clarification_request"),
                      "clarify",
                      t("course_interview.workspace.clarification_request"),
                    )
                : undefined
            }
            onRequestHint={
              phase === "questioning"
                ? () =>
                    void handleAssistance(
                      t("course_interview.workspace.hint_request"),
                      "hint",
                      t("course_interview.workspace.hint_request"),
                    )
                : undefined
            }
            onExplainTerm={
              phase === "questioning"
                ? (term) =>
                    void handleAssistance(
                      t("course_interview.workspace.term_request", { term }),
                      "explain_term",
                      t("course_interview.workspace.term_request", { term }),
                    )
                : undefined
            }
            statusMessage={
              agentStatus === "error"
                ? dictationHasError && dictation.error
                  ? t(
                      `course_interview.workspace.microphone_errors.${dictation.error}`,
                    )
                  : t("course_interview.workspace.answer_recovery_error")
                : undefined
            }
            onRetry={() => {
              if (!connected) {
                setConnected(navigator.onLine);
              } else if (dictationHasError) {
                dictation.retry();
              } else {
                void (phase === "opening" || phase === "readiness"
                  ? handleOnboarding()
                  : handleRespond());
              }
            }}
            replayAvailable={voiceOn}
            activeTurnActions={
              (phase === "opening" || phase === "readiness") &&
              onboardingStage !== "completed" ? (
                <SetupChecklist
                  stage={onboardingStage}
                  candidateName={candidateName}
                  language={interviewLanguage}
                  micConnected={dictation.supported}
                  disabled={onboarding.isPending || aiSpeaking}
                  pending={onboarding.isPending}
                  onLanguageChange={(language) => {
                    setInterviewLanguage(language);
                    void i18n.changeLanguage(language);
                  }}
                  onAction={(action, payload) =>
                    void handleOnboarding(
                      action,
                      payload?.language,
                      payload?.name,
                    )
                  }
                />
              ) : undefined
            }
            activeTurnActionsVisible={
              (phase === "opening" || phase === "readiness") &&
              onboardingStage !== "completed" &&
              !onboarding.isPending
            }
          />

          {closingCeremonyActive && phase === "questioning" && (
            <div className="shrink-0 border-t border-border bg-primary-soft/40 px-4 py-3">
              <div className="mx-auto flex max-w-[840px] flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-text-muted">
                  {t("course_interview.workspace.wrap_up_hint")}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={respond.isPending}
                  onClick={() => void beginClosing("natural")}
                  className="gap-1.5 bg-white"
                >
                  {t("course_interview.workspace.skip_and_finish")}
                </Button>
              </div>
            </div>
          )}

          {(currentQuestion && phase === "questioning") ||
          phase === "opening" ||
          phase === "readiness" ? (
            <FocusedAnswerComposer
              value={
                dictation.listening && dictation.interim
                  ? `${answerText}${answerText.trim().length > 0 ? " " : ""}${dictation.interim}`
                  : answerText
              }
              draftLength={answerText.length}
              onChange={setAnswerText}
              onSubmit={() =>
                void (phase === "opening" || phase === "readiness"
                  ? handleOnboarding()
                  : handleRespond())
              }
              onFinishRecording={() =>
                void (phase === "opening" || phase === "readiness"
                  ? handleOnboarding()
                  : handleRespond())
              }
              sending={respond.isPending || onboarding.isPending}
              micAvailable={Boolean(
                (phase === "opening" || phase === "readiness" || isHybrid) &&
                  dictation.supported,
              )}
              micActive={dictation.listening}
              micPaused={dictation.paused}
              micError={
                dictation.error === "unsupported" ? undefined : dictation.error
              }
              onMicStart={dictation.start}
              onMicPause={dictation.pause}
              onMicResume={dictation.resume}
              onMicCancel={dictation.cancel}
              onMicRetry={dictation.retry}
              transcriptOpen={transcriptOpen}
              onTranscriptToggle={() => setTranscriptOpen((open) => !open)}
              elapsed={elapsed}
              status={agentStatus}
              onEndInterview={() => setEndDialogOpen(true)}
              placeholder={
                phase === "opening" || phase === "readiness"
                  ? t("course_interview.onboarding.reply_placeholder")
                  : undefined
              }
            />
          ) : (
            <div className="shrink-0 border-t border-border bg-white px-4 py-6 text-center">
              <p
                className="text-sm text-text-muted"
                role="status"
                aria-live="polite"
              >
                {phase === "transition"
                  ? pendingNextQuestion || pendingFinalTransition
                    ? t("course_interview.transitions.status")
                    : t("course_interview.onboarding.starting_assessment")
                  : phase === "closing"
                    ? t("course_interview.workspace.preparing_goodbye")
                    : t("course_interview.status.compiling_results")}
              </p>
            </div>
          )}
        </div>

        <TranscriptPanel
          open={transcriptOpen}
          onClose={() => setTranscriptOpen(false)}
          transcript={transcript}
          questionTypeLabel={(type) => questionTypeLabel(type, t)}
          speak={speakIfOn}
          onSpeakingChange={(speaking) => setAiSpeaking(voiceOn && speaking)}
          onReplay={(turn) => void speakIfOn(turn.text)}
          replayDisabled={!voiceOn}
          replayingTurnId={null}
        />
      </div>

      <EndInterviewDialog
        open={endDialogOpen}
        onOpenChange={(open) => {
          if (finish.isPending && !open) return;
          setEndDialogOpen(open);
        }}
        onConfirm={() => void beginClosing("ended_early")}
        isPending={finish.isPending}
      />
      {leaveInterviewDialog}
    </div>
  );
}
