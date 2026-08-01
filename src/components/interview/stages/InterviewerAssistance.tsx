import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

import { AiTypingMessage } from "@/components/interview/ai-typing-message";
import { MessageTurnActions } from "@/components/interview/conversation";
import type { ConversationTurn } from "@/lib/interview/types";
import { InterviewerAssistanceActions } from "./InterviewerAssistanceActions";
import { InterviewerAssistanceTermInput } from "./InterviewerAssistanceTermInput";
import type { StageSpeak } from "./types";

/** Clarification / hint card that sits under the active question. */
export function InterviewerAssistance({
  turn,
  speak,
  onSpeakingChange,
  onPresentationComplete,
  actionsVisible,
  disabled,
  hintUsed,
  onReplayQuestion,
  onRequestHint,
  onExplainTerm,
}: {
  turn: ConversationTurn;
  speak: StageSpeak;
  onSpeakingChange: (speaking: boolean) => void;
  onPresentationComplete: () => void;
  actionsVisible: boolean;
  disabled: boolean;
  hintUsed: boolean;
  onReplayQuestion: () => void;
  onRequestHint?: () => void;
  onExplainTerm?: (term: string) => void;
}) {
  const { t } = useTranslation();
  const [termOpen, setTermOpen] = useState(false);
  const [term, setTerm] = useState("");

  const submitTerm = () => {
    const value = term.trim();
    if (!value || disabled || !onExplainTerm) return;
    onExplainTerm(value);
    setTerm("");
    setTermOpen(false);
  };

  return (
    <section
      className="rounded-2xl border border-primary/15 bg-primary-soft/35 px-5 py-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-safe:ease-out sm:ml-14 sm:px-6"
      aria-label={t("course_interview.workspace.interviewer_assistance")}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.1em] text-primary">
            {turn.kind === "hint"
              ? t("course_interview.workspace.small_hint")
              : t("course_interview.workspace.interviewer_clarification")}
          </p>
          <AiTypingMessage
            key={turn.id}
            text={turn.text}
            animate
            speak={speak}
            onTick={() => undefined}
            onTypingChange={onSpeakingChange}
            onTextComplete={() => undefined}
            onPresentationComplete={onPresentationComplete}
            presentationKind="question"
            className="text-[15px] leading-7 text-text-strong sm:text-base"
          />
        </div>
      </div>

      <MessageTurnActions visible={actionsVisible}>
        <InterviewerAssistanceActions
          disabled={disabled}
          hintUsed={hintUsed}
          termOpen={termOpen}
          onReplayQuestion={onReplayQuestion}
          onToggleTerm={() => setTermOpen((open) => !open)}
          onRequestHint={onRequestHint}
          onExplainTerm={onExplainTerm}
        />

        {termOpen && (
          <InterviewerAssistanceTermInput
            turnId={turn.id}
            term={term}
            disabled={disabled}
            onTermChange={setTerm}
            onSubmit={submitTerm}
            onClose={() => setTermOpen(false)}
          />
        )}
      </MessageTurnActions>
    </section>
  );
}
