/**
 * The individual controls in the voice-call action row: mic pause/resume,
 * finish answer, elapsed clock, and end interview.
 *
 * Extracted from `voice-controls.tsx` verbatim — same elements, same classes,
 * same disabled expressions, same handler bodies — so the row's own component
 * stays a layout with one decision per control instead of carrying every
 * button's branch set.
 */
import { Check, Clock3, Pause, PhoneOff, Play, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * `useTrackToggle().toggle`. Typed structurally rather than imported so this
 * module does not need the LiveKit generic plumbing; the union LiveKit returns
 * is assignable to it.
 */
export type MicToggleFn = (forceState?: boolean) => Promise<unknown>;

export function MicToggleButton({
  micEnabled,
  micPending,
  finishingAnswer,
  agentSpeaking,
  pausedByUser,
  toggle,
  onPausedByUserChange,
  onMicErrorChange,
}: {
  micEnabled: boolean;
  micPending: boolean;
  finishingAnswer: boolean;
  agentSpeaking: boolean;
  pausedByUser: boolean;
  toggle: MicToggleFn;
  onPausedByUserChange: (paused: boolean) => void;
  onMicErrorChange: (failed: boolean) => void;
}) {
  if (micEnabled) {
    return (
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => {
          onPausedByUserChange(true);
          void toggle(false);
        }}
        disabled={micPending || finishingAnswer || agentSpeaking}
        className="min-h-11"
      >
        <Pause className="h-4 w-4" />
        <span className="hidden sm:inline">Pause</span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={() => {
        onPausedByUserChange(false);
        onMicErrorChange(false);
        void toggle(true).catch(() => onMicErrorChange(true));
      }}
      disabled={micPending || finishingAnswer || agentSpeaking}
      className="min-h-11"
    >
      {micPending ? (
        <RotateCcw className="h-4 w-4 animate-spin" />
      ) : (
        <Play className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {pausedByUser ? "Resume" : "Start answering"}
      </span>
    </Button>
  );
}

export function FinishAnswerButton({
  micEnabled,
  micPending,
  finishingAnswer,
  agentSpeaking,
  toggle,
  onPausedByUserChange,
  onFinishingAnswerChange,
}: {
  micEnabled: boolean;
  micPending: boolean;
  finishingAnswer: boolean;
  agentSpeaking: boolean;
  toggle: MicToggleFn;
  onPausedByUserChange: (paused: boolean) => void;
  onFinishingAnswerChange: (finishing: boolean) => void;
}) {
  return (
    <Button
      type="button"
      size="lg"
      onClick={() => {
        onPausedByUserChange(false);
        onFinishingAnswerChange(true);
        void toggle(false);
      }}
      disabled={!micEnabled || micPending || finishingAnswer || agentSpeaking}
      className="min-h-11"
    >
      <Check className="h-4 w-4" />
      <span className="hidden sm:inline">Finish answer</span>
    </Button>
  );
}

export function ElapsedBadge({ elapsed }: { elapsed: string }) {
  return (
    <span className="ml-auto inline-flex items-center gap-1.5 px-1 font-mono text-xs font-semibold tabular-nums text-text-muted sm:px-2">
      <Clock3 className="hidden h-3.5 w-3.5 sm:block" />
      {elapsed}
    </span>
  );
}

export function EndInterviewButton({
  isEnding,
  onRequestEnd,
}: {
  isEnding: boolean;
  onRequestEnd: () => void;
}) {
  return (
    <Button
      variant="destructive"
      onClick={onRequestEnd}
      disabled={isEnding}
      className="min-h-11 rounded-lg px-3 font-semibold text-danger hover:bg-danger/10"
      aria-label="End interview"
      title="End interview"
    >
      <PhoneOff className="h-4 w-4" />
      <span className="hidden sm:inline">
        {isEnding ? "Ending…" : "End interview"}
      </span>
    </Button>
  );
}
