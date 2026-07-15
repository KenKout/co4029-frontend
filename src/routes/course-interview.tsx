import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Clock,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { useCourseBySlug } from "@/lib/api/hooks/courses";
import {
  useFinishInterview,
  useGapReport,
  useInterviewForTaking,
  useInterviewRespond,
  useInterviewSession,
  useStartInterviewSession,
} from "@/lib/api/hooks/interviews";
import { ApiError } from "@/lib/api/client";
import type {
  InterviewQuestionPublic,
  InterviewSessionFinishResponse,
  InterviewSessionStartResponse,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { VoiceRoom } from "@/components/interview/voice-room";
import { useSpeechDictation } from "@/lib/hooks/use-speech-dictation";
import { type SpeechPersona } from "@/lib/hooks/use-speech-synthesis";
import { useInterviewNarration } from "@/lib/hooks/use-interview-narration";
import { AiTypingMessage } from "@/components/interview/ai-typing-message";

interface ChatTurn {
  id: string;
  role: "ai" | "user";
  text: string;
  questionType?: string | null;
  isFollowUp?: boolean;
}

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

function makeAiTurn(question: InterviewQuestionPublic, isFollowUp = false): ChatTurn {
  return {
    id: `q-${question.id}-${isFollowUp ? "f" : "m"}`,
    role: "ai",
    text: question.prompt_text,
    questionType: question.question_type,
    isFollowUp,
  };
}

function makeFollowUpTurn(text: string, key: string): ChatTurn {
  return { id: `f-${key}`, role: "ai", text, isFollowUp: true };
}

function makeUserTurn(text: string, key: string): ChatTurn {
  return { id: `a-${key}`, role: "user", text };
}

/**
 * How long to keep a closing message on screen + audible before transitioning
 * to the evaluation screen (adaptive safeguard #6: the final AI utterance must
 * be seen/heard, not blown away by is_finished). Scales with reading length
 * (~15 chars/sec) plus headroom when narration is on, clamped to a sane range.
 */
function closingHoldMs(text: string, voiceOn: boolean): number {
  const readMs = Math.ceil(text.length / 15) * 1000;
  const base = Math.min(Math.max(readMs, 2000), 9000);
  return voiceOn ? base + 1500 : base;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestionPublic | null>(null);
  const [transcript, setTranscript] = useState<ChatTurn[]>([]);
  const [answerText, setAnswerText] = useState("");
  const [finishResult, setFinishResult] = useState<InterviewSessionFinishResponse | null>(null);
  const [inputMode, setInputMode] = useState<"voice" | "text" | "hybrid">("text");
  // true = voice session started and LiveKitRoom is active
  const [voiceActive, setVoiceActive] = useState(false);
  // polling active when voice session is completing
  const [pollingCompletion, setPollingCompletion] = useState(false);

  const respond = useInterviewRespond(sessionId);
  const finish = useFinishInterview(sessionId);
  // Don't keep polling for a gap report that will never be generated once
  // the evaluation has terminally failed (see evaluationFailed below) —
  // the 404-retry loop would otherwise burn its full 60 attempts (~3 min)
  // for nothing.
  const { data: gapReport, isPending: gapReportPending } = useGapReport(
    finishResult && finishResult.status !== "failed" ? sessionId : null,
  );

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
    finishResult && finishVerdict === null && !evaluationTerminallyFailed
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
    !!finishResult && liveVerdict === null && !evaluationFailed;

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
      setFinishResult({
        session_id: sessionStatus.session_id,
        status: sessionStatus.status,
        pass_verdict: sessionStatus.pass_verdict ?? null,
        total_score: null,
        rubric_scores: [],
      });
    }
  }, [pollingCompletion, sessionStatus]);

  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

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
  }, [currentQuestion?.id]);

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
      if (voiceOn) narration.narrate(text);
    },
    [voiceOn, narration],
  );
  // Silence any in-flight speech the moment the student mutes.
  useEffect(() => {
    if (!voiceOn) narration.cancel();
  }, [voiceOn, narration]);

  // Id of the most recently-added AI turn — only this one animates (types) and
  // speaks. Earlier AI turns render their full text immediately and silently.
  const lastAiTurnId = useMemo(() => {
    for (let i = transcript.length - 1; i >= 0; i -= 1) {
      if (transcript[i].role === "ai") return transcript[i].id;
    }
    return null;
  }, [transcript]);

  function handleStartSuccess(payload: InterviewSessionStartResponse) {
    if (!payload.first_question) {
      toast.error(t("course_interview.errors.no_question_available"));
      setSessionId(null);
      setCurrentQuestion(null);
      setTranscript([]);
      return;
    }
    setSessionId(payload.session_id);
    setCurrentQuestion(payload.first_question);
    setTranscript([makeAiTurn(payload.first_question)]);
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
      handleStartSuccess(payload);
      // Only enter voice mode when handleStartSuccess actually committed to a
      // session — i.e. the backend returned a first question. When it didn't
      // (e.g. config published with only pending questions), the toast in
      // handleStartSuccess already informed the user; staying on the
      // mode-selection screen lets them retry without joining an empty room.
      if (isVoice && payload.first_question) {
        setVoiceActive(true);
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.status === 429
          ? t("course_interview.errors.rate_limited")
          : t("course_interview.errors.start_failed"),
      );
    }
  }

  /** Called by VoiceRoom when the agent leaves or the user ends the call.
   *
   * Always fires `/finish` (idempotent: the backend `submit_session` returns
   * early if the session is no longer in_progress). This finalizes a
   * user-initiated "End interview" — disconnect alone is non-terminal — while
   * staying harmless when the agent already finalized a natural completion.
   * Then polls session status until terminal. */
  function handleVoiceCompleted() {
    setVoiceActive(false);
    if (sessionId) {
      finish.mutate(undefined, {
        // Errors here are non-fatal — polling still detects the terminal
        // status set by the agent's own submit_session.
        onError: () => undefined,
      });
    }
    setPollingCompletion(true);
  }

  async function handleRespond() {
    if (!currentQuestion || !sessionId) return;
    if (dictation.listening) dictation.stop();
    const trimmed = answerText.trim();
    if (!trimmed) {
      toast.error(t("course_interview.errors.answer_required"));
      return;
    }

    const userTurnKey = `${currentQuestion.id}-${Date.now()}`;
    setTranscript((prev) => [...prev, makeUserTurn(trimmed, userTurnKey)]);
    setAnswerText("");

    try {
      const result = await respond.mutateAsync({
        session_id: sessionId,
        session_question_id: currentQuestion.id,
        answer_text: trimmed,
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
      const standaloneText =
        !isAdvance && (result.ai_turn_text || result.ai_followup_text)
          ? result.ai_turn_text || result.ai_followup_text!
          : result.ai_followup_text || null;

      if (standaloneText) {
        setTranscript((prev) => [
          ...prev,
          makeFollowUpTurn(standaloneText, `${userTurnKey}-fu`),
        ]);
      }

      // should_finish is the adaptive signal; is_finished is the legacy one.
      // Either means the interview is over.
      const finished = Boolean(result.should_finish ?? result.is_finished);

      if (finished) {
        // Safeguard #6: keep the closing utterance on screen + let narration
        // play before swapping to the evaluation screen. Never let the finish
        // transition swallow the final AI message.
        setCurrentQuestion(null);
        if (standaloneText) {
          await sleep(closingHoldMs(standaloneText, voiceOn));
        }
        await handleFinish();
        return;
      }

      if (result.next_question) {
        setCurrentQuestion(result.next_question);
        setTranscript((prev) => [...prev, makeAiTurn(result.next_question!)]);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        toast.error(t("course_interview.errors.rate_limited"));
      } else {
        toast.error((err as Error).message || t("course_interview.errors.send_failed"));
      }
    }
  }

  async function handleFinish() {
    if (!sessionId) return;
    try {
      const result = await finish.mutateAsync();
      setFinishResult(result);
    } catch (err) {
      toast.error((err as Error).message || t("course_interview.errors.finish_failed"));
    }
  }

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
                  : verdictPending
                    ? "bg-gradient-to-br from-m3-surface-container to-m3-surface-container-high text-m3-primary"
                    : liveVerdict
                      ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
                      : "bg-gradient-to-br from-m3-primary to-m3-secondary text-white",
              )}
            >
              {evaluationFailed ? (
                "!"
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
                : verdictPending
                  ? t("course_interview.results.evaluating")
                  : liveVerdict
                    ? t("course_interview.results.passed")
                    : t("course_interview.results.completed")}
            </h2>
            <p className="text-m3-on-surface-variant text-sm mb-6">
              {evaluationFailed
                ? t("course_interview.results.evaluation_failed_summary")
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
      <div className="min-h-[70vh] pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-m3-surface-container text-m3-primary font-bold text-sm">
              <Mic className="h-4 w-4" />
              {t("course_interview.labels.ai_interview")} — Voice
            </div>
          </div>
          <h1 className="font-headline font-extrabold text-3xl text-m3-primary mb-6">
            {config.title}
          </h1>
          <VoiceRoom sessionId={sessionId} onCompleted={handleVoiceCompleted} />
        </div>
      </div>
    );
  }

  // ── Pre-start screen (mode selection) ─────────────────────────────────────
  if (!sessionId) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 py-10">
        <div className="max-w-2xl w-full mx-auto space-y-6">
          <GlassCard className="p-8 sm:p-10 text-center">
            <h1 className="font-headline font-extrabold text-3xl text-m3-primary mb-3">
              {config.title}
            </h1>
            <p className="text-m3-on-surface-variant mb-6">
              {t("course_interview.intro.description")}
            </p>

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

            {isHybrid && (
              <div className="flex items-center justify-center gap-2 mb-6 text-xs text-m3-on-surface-variant">
                <Mic className="h-3.5 w-3.5 text-m3-primary" />
                {t("course_interview.hybrid.prestart_hint")}
              </div>
            )}

            {!isHybrid && supportedModes.length > 1 && (
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
              onClick={() => void handleStart()}
              disabled={startSession.isPending}
              className="gradient-primary text-white rounded-xl font-bold gap-2 px-8 py-3 h-auto"
            >
              {startSession.isPending
                ? t("course_interview.actions.starting")
                : inputMode === "voice"
                  ? "Start voice interview"
                  : t("course_interview.actions.start")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </GlassCard>
        </div>
      </div>
    );
  }

  // ── Text mode chat UI ──────────────────────────────────────────────────────
  return (
    <div className="min-h-[70vh] pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Link to="/courses/$slug/learn" params={{ slug }}>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl text-m3-on-surface-variant hover:text-m3-primary gap-1.5 text-xs font-bold px-3"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("course_interview.actions.course")}
              </Button>
            </Link>
            <span className="text-m3-on-surface-variant text-sm font-medium hidden sm:block">
              {course.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setVoiceOn((v) => !v)}
              aria-pressed={voiceOn}
              aria-label={
                voiceOn
                  ? t("course_interview.narration.mute")
                  : t("course_interview.narration.unmute")
              }
              title={
                voiceOn
                  ? t("course_interview.narration.mute")
                  : t("course_interview.narration.unmute")
              }
              className="rounded-xl text-m3-on-surface-variant hover:text-m3-primary gap-1.5 text-xs font-bold px-3"
            >
              {voiceOn ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {voiceOn
                  ? t("course_interview.narration.on")
                  : t("course_interview.narration.off")}
              </span>
            </Button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-m3-surface-container text-m3-primary font-bold text-sm">
              <Sparkles className="h-4 w-4" />
              {t("course_interview.labels.ai_interview")}
            </div>
          </div>
        </div>

        <h1 className="font-headline font-extrabold text-3xl text-m3-primary mb-6">
          {config.title}
        </h1>

        <div className="space-y-4 mb-6">
          {transcript.map((turn) => {
            const label = questionTypeLabel(turn.questionType, t);
            return (
              <div
                key={turn.id}
                className={cn(
                  "flex gap-3",
                  turn.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "rounded-xl px-6 py-5 max-w-[85%] shadow-sm",
                    turn.role === "ai"
                      ? "bg-surface-elev border border-m3-outline-variant/20"
                      : "bg-m3-primary text-white",
                  )}
                >
                  {turn.role === "ai" && label && !turn.isFollowUp && (
                    <span className="block text-[10px] uppercase tracking-widest font-bold text-m3-secondary mb-1">
                      {label}
                    </span>
                  )}
                  {turn.role === "ai" && turn.isFollowUp && (
                    <span className="block text-[10px] uppercase tracking-widest font-bold text-m3-outline mb-1">
                      {t("course_interview.sections.follow_up")}
                    </span>
                  )}
                  {turn.role === "ai" ? (
                    <AiTypingMessage
                      text={turn.text}
                      animate={turn.id === lastAiTurnId}
                      speak={speakIfOn}
                      onTick={() =>
                        transcriptEndRef.current?.scrollIntoView({
                          behavior: "smooth",
                        })
                      }
                    />
                  ) : (
                    <p className="text-base leading-relaxed whitespace-pre-wrap">
                      {turn.text}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={transcriptEndRef} />
        </div>

        {currentQuestion ? (
          <GlassCard className="p-5">
            <label
              htmlFor="answer"
              className="block text-xs font-bold text-m3-outline uppercase tracking-widest mb-2"
            >
              {t("course_interview.labels.answer")}
            </label>
            <textarea
              id="answer"
              value={
                dictation.listening && dictation.interim
                  ? `${answerText}${answerText.trim().length > 0 ? " " : ""}${dictation.interim}`
                  : answerText
              }
              onChange={(e) => setAnswerText(e.target.value)}
              rows={8}
              disabled={respond.isPending}
              placeholder={t("course_interview.placeholders.answer")}
              className="w-full rounded-xl border border-m3-outline-variant/30 bg-surface-elev px-4 py-3 text-base text-m3-on-surface resize-y min-h-[10rem] focus:outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20"
            />
            {isHybrid && dictation.supported && (
              <div className="flex items-center gap-2 mt-2">
                <Button
                  type="button"
                  variant={dictation.listening ? "default" : "outline"}
                  size="sm"
                  onClick={() => dictation.toggle()}
                  disabled={respond.isPending}
                  className={cn(
                    "rounded-xl font-bold text-xs gap-2",
                    dictation.listening && "gradient-primary text-white animate-pulse",
                  )}
                >
                  {dictation.listening ? (
                    <Mic className="h-3.5 w-3.5" />
                  ) : (
                    <MicOff className="h-3.5 w-3.5" />
                  )}
                  {dictation.listening
                    ? t("course_interview.hybrid.listening")
                    : t("course_interview.hybrid.speak_answer")}
                </Button>
                <span className="text-[11px] text-m3-outline">
                  {t("course_interview.hybrid.dictation_hint")}
                </span>
              </div>
            )}
            {isHybrid && !dictation.supported && (
              <p className="text-[11px] text-m3-outline mt-2">
                {t("course_interview.hybrid.unsupported")}
              </p>
            )}
            <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
              <span className="text-xs text-m3-outline">
                {t("course_interview.labels.character_count", { count: answerText.length })}
              </span>
              <div className="flex items-center gap-3 flex-wrap justify-end">
                <Button
                  variant="ghost"
                  onClick={() => void handleFinish()}
                  disabled={finish.isPending || respond.isPending}
                  className="font-bold text-m3-outline hover:text-m3-on-surface rounded-xl gap-2 text-sm"
                >
                  <Clock className="h-4 w-4" />
                  {t("course_interview.actions.finish_early")}
                </Button>
                <Button
                  onClick={() => void handleRespond()}
                  disabled={respond.isPending || answerText.trim().length === 0}
                  className="gradient-primary text-white font-bold rounded-xl gap-2 shadow-ai-glow px-6 py-3 h-auto hover:opacity-90 active:scale-95 transition-all"
                >
                  {respond.isPending
                    ? t("course_interview.actions.sending")
                    : t("course_interview.actions.send_answer")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="p-6 text-center">
            <p className="text-sm text-m3-on-surface-variant">
              {t("course_interview.status.compiling_results")}
            </p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
