import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  History,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
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
  EndInterviewDialog,
  FocusedAnswerComposer,
  FocusedInterviewStage,
  InterviewHeader,
  LeaveInterviewDialog,
  OnboardingActions,
  StartInterviewDialog,
  type ConversationTurn,
  type InterviewAgentStatus,
  resolveInterviewState,
  useInterviewTimer,
} from "@/components/interview/interview-workspace";

function questionTypeLabel(type: string | null | undefined, t: (k: string) => string) {
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
  return {
    id: `q-${question.id}-${isFollowUp ? "f" : "m"}`,
    role: "ai",
    text: question.prompt_text,
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

type InterviewTurnAction = "answer" | "repeat" | "clarify" | "explain_term" | "hint";

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

function restoreHistoryTurn(turn: InterviewSessionHistoryTurn): ConversationTurn {
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
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
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
  const { data: takingPayload, isLoading: configLoading } = useInterviewForTaking(configId);
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

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestionPublic | null>(null);
  const [transcript, setTranscript] = useState<ConversationTurn[]>([]);
  const [answerText, setAnswerText] = useState("");
  const [finishResult, setFinishResult] = useState<InterviewSessionFinishResponse | null>(null);
  const [inputMode, setInputMode] = useState<"voice" | "text" | "hybrid">("text");
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
  const [pendingFinishResult, setPendingFinishResult] =
    useState<InterviewSessionFinishResponse | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const voiceInitialTranscriptRef = useRef<ConversationTurn[]>([]);
  const [assessmentStartedAtMs, setAssessmentStartedAtMs] = useState<number | null>(null);
  const sessionDeadlineAtRef = useRef<number | null>(null);
  const timeoutTriggeredRef = useRef(false);

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
      : Math.max(0, Math.floor((Date.now() - sessionStartedAtRef.current) / 1000));

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
  const evaluationTerminallyFailed =
    finishResult?.status === "failed" || false;
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
    (verdictPoll?.pass_verdict ?? null) ?? finishVerdict;
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
    assessmentStartedAtMs !== null && phase !== "closing" && phase !== "results",
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
        toast.error("Microphone access denied. Falling back to text interview.");
        setInputMode("text");
        // Fall through to start a text session
        try {
          const payload = await startSession.mutateAsync({ input_mode: "text" });
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
    const submittedText = naturalText || guidedText;
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
        setPhase(result.onboarding_stage === "readiness" ? "readiness" : "opening");
      }
    } catch (error) {
      setTranscript((previous) => previous.filter((turn) => turn.id !== `a-${turnKey}`));
      setAnswerText(naturalText);
      toast.error((error as Error).message || t("course_interview.onboarding.send_failed"));
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
          (error as Error).message || t("course_interview.errors.finish_failed"),
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
      finish.mutate(
        { reason: "natural" },
        { onError: () => undefined },
      );
    }
    setPollingCompletion(true);
  }

  const handleTurnPresented = useCallback(
    (turn: ConversationTurn) => {
      if (turn.kind === "transition" && phase === "transition" && pendingFirstQuestion) {
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
      if (turn.kind === "closing" && phase === "closing" && pendingFinishResult) {
        setPhase("results");
        setFinishResult(pendingFinishResult);
        setPendingFinishResult(null);
      }
    },
    [inputMode, pendingFinishResult, pendingFirstQuestion, phase],
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

  async function handleRespond(
    answerOverride?: string,
    options: {
      preserveDraft?: boolean;
      turnAction?: InterviewTurnAction;
      displayText?: string;
    } = {},
  ) {
    if (!currentQuestion || !sessionId || respond.isPending) return;
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

    const userTurnKey = `${currentQuestion.id}-${Date.now()}`;
    const turnAction = options.turnAction ?? "answer";
    const localTurnKind =
      turnAction === "hint"
        ? "hint"
        : turnAction === "clarify" || turnAction === "explain_term"
          ? "clarification"
          : "answer";
    setTranscript((prev) => [
      ...prev,
      makeUserTurn(
        options.displayText ?? trimmed,
        userTurnKey,
        currentElapsedSeconds(),
        localTurnKind,
      ),
    ]);
    if (!options.preserveDraft) setAnswerText("");

    try {
      const result = await respond.mutateAsync({
        session_id: sessionId,
        session_question_id: currentQuestion.id,
        answer_text: trimmed,
        turn_action: turnAction,
        // Idempotency key so a network retry never double-inserts the answer
        // or re-runs the adaptive pipeline (adaptive safeguard #1). Legacy
        // backend ignores it harmlessly.
        turn_key: newTurnKey(),
      });

      // ── Adaptive path (structured fields present) ────────────────────────
      // On an ADVANCE the backend puts ONLY ack+transition in ai_followup_text
      // and the question in next_question, so rendering both never doubles the
      // question. On a NON-advance (probe/clarify/repeat/closing) the whole
      // utterance is in ai_followup_text / ai_turn_text and next_question is
      // null. We prefer ai_turn_text (the combined natural utterance) when the
      // action is not an advance, else fall back to ai_followup_text.
      const isAdvance = Boolean(result.next_question);
      const finished = Boolean(result.should_finish ?? result.is_finished);
      const standaloneText =
        !isAdvance && (result.ai_turn_text || result.ai_followup_text)
          ? result.ai_turn_text || result.ai_followup_text!
          : result.ai_followup_text || null;

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
      if (!options.preserveDraft) setAnswerText(trimmed);
      if (err instanceof ApiError && err.status === 429) {
        toast.error(t("course_interview.errors.rate_limited"));
      } else {
        toast.error((err as Error).message || t("course_interview.errors.send_failed"));
      }
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
              <Button variant="outline" className="rounded-xl ghost-border font-bold text-sm gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t("course_interview.actions.back_to_course")}
              </Button>
            </Link>
          </GlassCard>

          {finishResult && !gapReport && gapReportPending && !evaluationFailed && (
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
                        <span className="block font-semibold mb-0.5">{item.topic}</span>
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
          onTranscriptChange={setTranscript}
        />
        {leaveInterviewDialog}
      </div>
    );
  }

  // ── Pre-start screen (mode selection) ─────────────────────────────────────
  if (!sessionId) {
    return (
      <div className="relative flex min-h-screen items-center justify-center px-4 py-16 sm:px-6">
        <Link
          to="/courses/$slug/learn"
          params={{ slug }}
          className="absolute left-4 top-4 inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-text-muted outline-none transition-colors hover:bg-surface-muted hover:text-text-strong focus-visible:ring-2 focus-visible:ring-primary/60 sm:left-6 sm:top-6"
          aria-label={t("course_interview.actions.back_to_course")}
        >
          <ArrowLeft className="h-4 w-4" />
          {t("course_interview.actions.back_to_course")}
        </Link>

        <div className="max-w-2xl w-full mx-auto space-y-6">
          <GlassCard className="p-8 sm:p-10 text-center">
            <h1 className="font-headline font-extrabold text-3xl text-m3-primary mb-3">
              {config.title}
            </h1>
            <p className="text-m3-on-surface-variant mb-6">
              {t("course_interview.intro.description")}
            </p>

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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-left">
              <div className="rounded-xl bg-m3-surface-container-low p-4">
                <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
                  {t("course_interview.labels.persona")}
                </span>
                <span className="text-base font-bold text-m3-primary">
                  {config.persona === "strict"
                    ? t("course_interview.values.persona.strict")
                    : config.persona === "supportive"
                      ? t("course_interview.values.persona.supportive")
                      : t("course_interview.values.persona.neutral")}
                </span>
              </div>
              <div className="rounded-xl bg-m3-surface-container-low p-4">
                <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
                  {t("course_interview.labels.time")}
                </span>
                <span className="text-base font-bold text-m3-on-surface">
                  {config.time_limit_minutes
                    ? t("course_interview.values.time_limit_minutes", {
                        minutes: config.time_limit_minutes,
                      })
                    : t("course_interview.values.no_limit")}
                </span>
              </div>
              <div className="rounded-xl bg-m3-surface-container-low p-4">
                <span className="block text-[10px] text-m3-outline uppercase font-bold mb-1 tracking-wider">
                  {t("course_interview.labels.max_attempts")}
                </span>
                <span className="text-base font-bold text-m3-secondary">
                  {config.max_attempts ?? t("course_interview.values.no_limit")}
                </span>
              </div>
            </div>

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
                    {mode === "voice" ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
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

      <FocusedInterviewStage
        transcript={transcript}
        status={agentStatus}
        transcriptOpen={transcriptOpen}
        onTranscriptOpenChange={setTranscriptOpen}
        assessmentActive={phase === "questioning"}
        currentQuestionNumber={currentQuestionNumber}
        totalQuestions={totalQuestions}
        currentQuestionType={currentQuestion?.question_type}
        isUserTyping={
          !respond.isPending &&
          !onboarding.isPending &&
          (answerText.trim().length > 0 || dictation.interim.trim().length > 0)
        }
        questionTypeLabel={(type) => questionTypeLabel(type, t)}
        speak={speakIfOn}
        onSpeakingChange={(speaking) => setAiSpeaking(voiceOn && speaking)}
        onTurnPresented={handleTurnPresented}
        onClarifyQuestion={
          phase === "questioning"
            ? () =>
                void handleRespond(
                  t("course_interview.workspace.clarification_request"),
                  { preserveDraft: true, turnAction: "clarify" },
                )
            : undefined
        }
        onRequestHint={
          phase === "questioning"
            ? () =>
                void handleRespond(t("course_interview.workspace.hint_request"), {
                  preserveDraft: true,
                  turnAction: "hint",
                })
            : undefined
        }
        onExplainTerm={
          phase === "questioning"
            ? (term) =>
                void handleRespond(
                  t("course_interview.workspace.term_request", { term }),
                  {
                    preserveDraft: true,
                    turnAction: "explain_term",
                  },
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
            <OnboardingActions
              stage={onboardingStage}
              language={interviewLanguage}
              disabled={onboarding.isPending || aiSpeaking}
              onLanguageChange={(language) => {
                setInterviewLanguage(language);
                void i18n.changeLanguage(language);
              }}
              onAction={(action, language) => void handleOnboarding(action, language)}
            />
          ) : undefined
        }
        activeTurnActionsVisible={
          (phase === "opening" || phase === "readiness") &&
          onboardingStage !== "completed" &&
          !onboarding.isPending
        }
      />

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
          <p className="text-sm text-text-muted" role="status" aria-live="polite">
            {phase === "transition"
              ? t("course_interview.onboarding.starting_assessment")
              : phase === "closing"
                ? t("course_interview.workspace.preparing_goodbye")
                : t("course_interview.status.compiling_results")}
          </p>
        </div>
      )}

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
