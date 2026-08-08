import { Bot } from "lucide-react";

import { AiTypingMessage } from "@/components/interview/ai-typing-message";
import type { ConversationTurn } from "@/lib/interview/types";
import type { StageSpeak } from "./types";
import { useCardPresented } from "./use-card-presented";

/**
 * Avatar plus the question text.
 *
 * TWO RENDERING PATHS, and which one runs is the whole point:
 *
 * 1. An in-room agent voices this turn (`agentSpeaks`). The card then renders
 *    its text STATICALLY, in full, immediately. It deliberately does not animate
 *    and does not narrate: the interviewer paraphrases every question — it opens
 *    in its own words and bridges from the previous answer — so the card's text
 *    is never the sentence being spoken. Animating it against that audio is what
 *    produced the reported "goes silent, then suddenly reads fast": the client
 *    was pacing one sentence to the playout of a different one. What the
 *    interviewer actually said streams into the conversation below as its own
 *    turn; the card stays a stable, quotable reference.
 *
 * 2. Nobody else is speaking (text-only session, browser narration, replay).
 *    Unchanged: `AiTypingMessage` types the text and drives narration itself.
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
}: {
  turn: ConversationTurn;
  animate: boolean;
  speak: StageSpeak;
  onSpeakingChange: (speaking: boolean) => void;
  onPresentationComplete: () => void;
  /** True when the LiveKit agent voices this turn (hybrid/voice in-room). */
  agentSpeaks?: boolean;
}) {
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
        {agentSpeaks ? (
          <StaticPrompt
            text={turn.text}
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
 * The question, whole and immediately readable.
 *
 * Reports presented at once so the action buttons and the composer unlock
 * without waiting on an animation that is not tracking anything real. A
 * candidate must never be held back from answering by a decorative reveal.
 */
function StaticPrompt({
  text,
  className,
  onSpeakingChange,
  onPresentationComplete,
}: {
  text: string;
  className: string;
  onSpeakingChange: (speaking: boolean) => void;
  onPresentationComplete: () => void;
}) {
  useCardPresented(onSpeakingChange, onPresentationComplete);
  return <p className={className}>{text}</p>;
}
