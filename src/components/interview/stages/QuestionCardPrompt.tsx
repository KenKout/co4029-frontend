import { Bot } from "lucide-react";

import { AiTypingMessage } from "@/components/interview/ai-typing-message";
import type { ConversationTurn } from "@/lib/interview/types";
import type { StageSpeak } from "./types";

/**
 * Avatar plus the typewritten question text. `key={turn.id}` stays on
 * `AiTypingMessage` so a new question still remounts the typewriter and replays
 * its entrance — moving it would silently break that.
 */
export function QuestionCardPrompt({
  turn,
  animate,
  speak,
  onSpeakingChange,
  onPresentationComplete,
}: {
  turn: ConversationTurn;
  animate: boolean;
  speak: StageSpeak;
  onSpeakingChange: (speaking: boolean) => void;
  onPresentationComplete: () => void;
}) {
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
          className="text-[21px] font-semibold leading-[1.5] tracking-[-0.01em] text-text-strong sm:text-2xl"
        />
      </div>
    </div>
  );
}
