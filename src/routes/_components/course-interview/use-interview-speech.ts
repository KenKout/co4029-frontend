import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useInterviewNarration } from "@/lib/hooks/use-interview-narration";
import type { NarrationPresentation } from "@/lib/hooks/use-interview-narration";
import { useSpeechDictation } from "@/lib/hooks/use-speech-dictation";
import { type SpeechPersona } from "@/lib/hooks/use-speech-synthesis";
import { resolvePersonaTraits } from "@/lib/interview/persona-traits";
import {
  createAgentVoiceCoordinator,
  type AgentVoicePhase,
} from "./agent-voice-presentation";
import type { useInterviewPhaseState } from "./use-interview-phase-state";
import type { useInterviewRouteData } from "./use-interview-route-data";
import type { useInterviewTurnState } from "./use-interview-turn-state";

/**
 * Transport modes, browser dictation and AI narration. Sixth hook group in the
 * page's hook order (see use-course-interview.ts) — moved verbatim from
 * course-interview.tsx.
 */
export function useInterviewSpeech(
  route: ReturnType<typeof useInterviewRouteData>,
  turn: ReturnType<typeof useInterviewTurnState>,
  phaseState: ReturnType<typeof useInterviewPhaseState>,
) {
  const { config, i18n } = route;
  const { sessionId, currentQuestion, setAnswerText } = turn;
  const { setInputMode, onboardingStage, interviewLanguage } = phaseState;

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
  }, [currentQuestion?.id, onboardingStage]);

  // The AI "speaks" each question aloud while it types out on screen (see
  // AiTypingMessage). Server-side TTS (same voice as the LiveKit agent) with a
  // browser-TTS fallback. Student-toggleable so it can be silenced.
  const [voiceOn, setVoiceOn] = useState(true);
  // When the LiveKit agent is live in the session's room it ALREADY speaks
  // every utterance through the room's audio track (session.say → TTS). The
  // client-side narration must then stay silent — otherwise the same words
  // play twice: the agent's audio lands first, then the client replays the
  // text as it types out, overlapping the agent. Set from the workspace
  // screen (the only place the room is reachable), same ref pattern as
  // `chatBridge`.
  const [roomConnected, setRoomConnected] = useState(false);
  // Render-phase mirror of `roomConnected` for the NARRATION decision. A plain
  // state read inside `speakIfOn` is one render too late: the transition /
  // first-question turn mounts, its AiTypingMessage effect calls `narrate()`
  // (children effects run BEFORE the workspace screen's effect that flips the
  // state), and by the time the cancel-on-handover fires the server TTS
  // request is already in flight. The ref is written during render — before
  // ANY effect — so `speakIfOn` sees the room handover synchronously. The
  // workspace screen calls `setRoomConnectedRef` during render (ref write,
  // no re-render) in addition to `setRoomConnected` (state, in an effect).
  const roomConnectedRef = useRef(false);
  const setRoomConnectedRef = useCallback((connected: boolean) => {
    roomConnectedRef.current = connected;
  }, []);
  const speakLang = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";
  // Persona drives the voice: a "strict" interview sounds firmer, a
  // "supportive" one warmer. Resolve the persona label to its trait dials (no
  // hardcoded per-name narrowing) and pass them through — prosody/WPM are then
  // DERIVED from traits (see lib/interview/persona-traits). The learner config
  // carries only the persona label, so this uses preset traits; teacher-tuned
  // overrides shape the server voice + LLM phrasing, which is where they matter.
  const speakTraits = resolvePersonaTraits(config?.persona);
  const narration = useInterviewNarration({
    sessionId,
    persona: speakTraits.key as SpeechPersona,
    traits: speakTraits,
    lang: speakLang,
    // Server TTS only works for English on this deployment (Deepgram Aura is
    // English-only; the gateway serves no TTS model). Gate by the SESSION
    // language — not the UI locale — so a VI session skips the always-503
    // server call and narrates with the browser voice directly, while an EN
    // session viewed under a VI UI still gets server (Deepgram) narration.
    serverNarrationEnabled: interviewLanguage !== "vi",
  });
  const silent = useCallback(
    (): NarrationPresentation => ({
      started: Promise.resolve(),
      finished: Promise.resolve(),
    }),
    [],
  );
  // Pacing for turns the AGENT speaks. Returning `silent()` for those turns is
  // what silences the client correctly, but it also handed AiTypingMessage an
  // already-resolved `started` — and that promise is exactly what holds the
  // text back until the voice begins. So the typewriter was released instantly
  // while the agent still had to join and synthesize, and question one was
  // nearly fully typed before the voice came up. The coordinator replaces the
  // lost signal with the agent's own `lk.agent.state` (fed by the workspace
  // screen), and degrades to the old settled presentation when no agent phase
  // is ever reported.
  const agentVoiceRef = useRef(createAgentVoiceCoordinator());
  const setAgentVoicePhase = useCallback((phase: AgentVoicePhase) => {
    agentVoiceRef.current.setPhase(phase);
  }, []);
  // Whether an agent is on its way, before `lk.agent.state` exists. Question
  // one mounts DURING the join (~10-13s), when no phase has been reported yet
  // and that is indistinguishable from a text-only session — without this the
  // turn degraded to the settled presentation and outran the voice.
  const setAgentExpected = useCallback((expected: boolean) => {
    agentVoiceRef.current.setAgentExpected(expected);
  }, []);
  const speakIfOn = useCallback(
    (text: string, options?: { agentVoiced?: boolean }) => {
      // Ceremony text the agent never says: present it immediately rather than
      // waiting on — and pacing to — an utterance that is not this one.
      if (roomConnectedRef.current && options?.agentVoiced === false) {
        return silent();
      }
      // The LiveKit agent in the room is the voice; narrating client-side as
      // well would double it (agent audio first, client replay on top). Read
      // the render-phase ref, not the state: the transition turn's narrate()
      // runs in a child effect BEFORE the parent state flip would land, and
      // a stale read there lets the overlap through.
      if (roomConnectedRef.current) return agentVoiceRef.current.present(text);
      if (voiceOn) return narration.narrate(text);
      return silent();
    },
    [voiceOn, narration, silent],
  );
  // Replay is user-initiated and the agent will not re-say a past turn on
  // demand, so it must NOT be silenced by the room gate: the only way to hear
  // a turn again in a live session is client-side narration.
  const replayIfOn = useCallback(
    (text: string) => {
      if (voiceOn) return narration.narrate(text);
      return silent();
    },
    [voiceOn, narration, silent],
  );
  // Silence any in-flight speech the moment the student mutes.
  useEffect(() => {
    if (!voiceOn) narration.cancel();
  }, [voiceOn, narration]);

  // Agent-takeover cut: the moment the LiveKit room handover starts, the agent
  // becomes the voice — cut any client narration still playing (typically the
  // tail of the last setup turn, or a first question narrated during the
  // connecting window before `connected` flipped). Without this the agent's
  // opening utterance overlaps the tail of the setup narration.
  const wasRoomConnectedRef = useRef(false);
  useEffect(() => {
    if (roomConnected && !wasRoomConnectedRef.current) narration.cancel();
    wasRoomConnectedRef.current = roomConnected;
  }, [roomConnected, narration]);

  return {
    supportedModes,
    isHybrid,
    dictation,
    voiceOn,
    setVoiceOn,
    roomConnected,
    setRoomConnected,
    /** Render-phase signal for the narration gate (see declaration). */
    roomConnectedRef,
    setRoomConnectedRef,
    narration,
    speakIfOn,
    replayIfOn,
    /** Feed the agent's `lk.agent.state` in so agent-spoken turns stay paced. */
    setAgentVoicePhase,
    /** Feed `roomWanted` in so a turn can wait for an agent still joining. */
    setAgentExpected,
  };
}
