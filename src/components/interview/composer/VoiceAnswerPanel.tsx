import { cn } from "@/lib/utils";
import { VoiceIdlePrompt } from "./VoiceIdlePrompt";
import { VoiceMicErrorRow } from "./VoiceMicErrorRow";
import { VoiceRecordingPanel } from "./VoiceRecordingPanel";

/**
 * The voice-mode card. Exactly one of three branches renders: microphone
 * error, an in-progress (active or paused) recording, or the idle start
 * prompt.
 */
export function VoiceAnswerPanel({
  micAvailable,
  micActive,
  micPaused,
  micError,
  errorKey,
  disabled,
  canFinish,
  listeningSilent,
  recordingSeconds,
  onStart,
  onPause,
  onResume,
  onFinish,
  onCancel,
  onRetry,
}: {
  micAvailable: boolean;
  micActive: boolean;
  micPaused: boolean;
  micError?: string | null;
  errorKey: string | null;
  disabled?: boolean;
  canFinish: boolean;
  listeningSilent: boolean;
  recordingSeconds: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onCancel: () => void;
  onRetry?: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-4",
        micError
          ? "border-danger/30 bg-danger/5"
          : micActive
            ? "border-primary/25 bg-primary-soft/40"
            : "border-border bg-surface-muted/60",
      )}
    >
      {micError ? (
        <VoiceMicErrorRow errorKey={errorKey} onRetry={onRetry} />
      ) : micActive || micPaused ? (
        <VoiceRecordingPanel
          micActive={micActive}
          listeningSilent={listeningSilent}
          recordingSeconds={recordingSeconds}
          canFinish={canFinish}
          disabled={disabled}
          onPause={onPause}
          onResume={onResume}
          onFinish={onFinish}
          onCancel={onCancel}
        />
      ) : (
        <VoiceIdlePrompt
          micAvailable={micAvailable}
          disabled={disabled}
          onStart={onStart}
        />
      )}
    </div>
  );
}
