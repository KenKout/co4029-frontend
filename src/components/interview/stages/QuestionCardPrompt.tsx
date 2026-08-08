import { useEffect, useRef } from "react";
import { Bot } from "lucide-react";

import { AiTypingMessage } from "@/components/interview/ai-typing-message";
import type { ConversationTurn } from "@/lib/interview/types";
import type { StageSpeak } from "./types";
import { useAgentSpokenText } from "./use-agent-spoken-text";
import type { TranscriptionLike } from "./use-agent-spoken-text";

/**
 * Avatar plus the question text.
 *
 * TWO RENDERING PATHS, and which one runs is the whole point:
 *
 * 1. The agent is speaking this turn (`agentSpeaks`). Then the words are NOT
 *    animated client-side. livekit-agents publishes a transcript already paced
 *    against the real TTS playout (`sync_transcription=True` in
 *    `realtime/agent.py` attaches a `TranscriptSynchronizer` that measures the
 *    actual audio), so the correct thing is simply to render what has been
 *    spoken so far. Every previous attempt at this drifted because the client
 *    was estimating — holding for `lk.agent.state` and typing at an assumed
 *    150 wpm — when the agent already knew the answer.
 *
 * 2. Nobody else is speaking (text-only session, browser narration, replay).
 *    Unchanged: `AiTypingMessage` types the text and drives narration itself.
 *
 * The fallback is deliberate: if the synchronised transcript has not arrived
 * (agent still joining, segment not matched yet) `spoken.text` is `null` and
 * path 2 runs, so the card is never blank.
 *
 * `key={turn.id}` stays on `AiTypingMessage` so a new question remounts the
 * typewriter and replays its entrance — moving it would silently break that.
 */
export function QuestionCardPrompt({
  turn,
  animate,
  speak,
  onSpeakingChange,
  onPresentationComplete,
  agentSpeaks = false,
  agentTranscriptions,
}: {
  turn: ConversationTurn;
  animate: boolean;
  speak: StageSpeak;
  onSpeakingChange: (speaking: boolean) => void;
  onPresentationComplete: () => void;
  /** True when the LiveKit agent voices this turn (hybrid/voice in-room). */
  agentSpeaks?: boolean;
  /** Segments from `useVoiceAssistant()`, resolved by an in-room caller. */
  agentTranscriptions?: readonly TranscriptionLike[];
}) {
  const spoken = useAgentSpokenText(turn.text, agentSpeaks, agentTranscriptions);
  // Matches the setup/onboarding turns (ConversationMessage's `isLatest` size)
  // so a question does not read as a different kind of message from the rest of
  // the conversation. It was `text-[21px] font-semibold`, which rendered every
  // question in bold — heavier than anything else on screen and, at three lines,
  // more tiring to read than the prose it replaced.
  const className = "text-lg leading-8 text-text-strong sm:text-xl";

  return (
    <div className="flex gap-4">
      <div className="mt-0.5 hidden size-10 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary-soft text-primary sm:flex">
        <Bot className="h-4.5 w-4.5" aria-hidden="true" />
      </div>
      <div
        id={`question-${turn.id}`}
        role="heading"
        aria-level={1}
        className="max-w-[44rem] text-text-strong"
      >
        {spoken.text !== null ? (
          <AgentPacedPrompt
            spokenText={spoken.text}
            fullText={turn.text}
            isFinal={spoken.isFinal}
            className={className}
            onSpeakingChange={onSpeakingChange}
            onPresentationComplete={onPresentationComplete}
          />
        ) : (
          <AiTypingMessage
            key={turn.id}
            text={turn.text}
            animate={animate}
            speak={speak}
            onTick={() => undefined}
            onTypingChange={onSpeakingChange}
            onTextComplete={() => undefined}
            onPresentationComplete={onPresentationComplete}
            presentationKind="question"
            className={className}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Question text mirrored from the agent's audio-synchronised transcript.
 *
 * The full question is present in the DOM the whole time — the unspoken tail is
 * just transparent — so screen readers and copy/paste get the real question and
 * the card does not reflow as words arrive. Only the visual reveal follows the
 * voice.
 */
function AgentPacedPrompt({
  spokenText,
  fullText,
  isFinal,
  className,
  onSpeakingChange,
  onPresentationComplete,
}: {
  spokenText: string;
  fullText: string;
  isFinal: boolean;
  className: string;
  onSpeakingChange: (speaking: boolean) => void;
  onPresentationComplete: () => void;
}) {
  // The transcript is the same sentence, but character offsets can differ
  // slightly (markup stripping, punctuation). Reveal by length, clamped.
  const revealed = fullText.slice(0, Math.min(spokenText.length, fullText.length));
  const remaining = fullText.slice(revealed.length);
  const complete = isFinal || remaining.length === 0;

  // Report the same two lifecycle signals AiTypingMessage would, so the
  // surrounding card (action buttons, composer unlock) behaves identically.
  useReportPresentation(complete, onSpeakingChange, onPresentationComplete);

  return (
    <p className={className} aria-live="off">
      <span>{revealed}</span>
      <span aria-hidden="true" className="opacity-0">
        {remaining}
      </span>
    </p>
  );
}

/**
 * Mirror `AiTypingMessage`'s speaking/complete callbacks for the agent-paced
 * path. Extracted so the component body stays a pure render.
 */
function useReportPresentation(
  complete: boolean,
  onSpeakingChange: (speaking: boolean) => void,
  onPresentationComplete: () => void,
) {
  const wasComplete = useRef(false);
  useEffect(() => {
    onSpeakingChange(!complete);
    if (complete && !wasComplete.current) {
      wasComplete.current = true;
      onPresentationComplete();
    }
  }, [complete, onSpeakingChange, onPresentationComplete]);
  useEffect(
    () => () => {
      onSpeakingChange(false);
    },
    [onSpeakingChange],
  );
}
