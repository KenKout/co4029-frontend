import { AnswerModeToggle } from "./AnswerModeToggle";
import { AudioInputMenu } from "./AudioInputMenu";
import type { AnswerMode } from "./types";
import { useRecordingTimer } from "./use-recording-timer";
import { VoiceAnswerPanel } from "./VoiceAnswerPanel";

export function AnswerControls({
  mode,
  onModeChange,
  micAvailable,
  micActive,
  micPaused,
  micError,
  disabled,
  canFinish,
  onStart,
  onPause,
  onResume,
  onFinish,
  onCancel,
  onRetry,
  speechDetected,
}: {
  mode: AnswerMode;
  onModeChange: (mode: AnswerMode) => void;
  micAvailable: boolean;
  micActive: boolean;
  micPaused: boolean;
  micError?: string | null;
  disabled?: boolean;
  canFinish: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onCancel: () => void;
  onRetry?: () => void;
  /** True once any speech/interim has been captured this session (drives the
   *  "listening but silent" nudge — #10). */
  speechDetected?: boolean;
}) {
  const recordingSeconds = useRecordingTimer(micActive, micPaused);
  const errorKey = micError
    ? `course_interview.workspace.microphone_errors.${micError}`
    : null;
  // A11y (#10): after a few seconds of active listening with nothing captured,
  // surface a "we can't hear you" nudge so a voice user isn't left wondering
  // whether the mic is working.
  const listeningSilent = micActive && !speechDetected && recordingSeconds >= 4;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <AnswerModeToggle
          mode={mode}
          onModeChange={onModeChange}
          micAvailable={micAvailable}
          disabled={disabled}
        />

        <AudioInputMenu micAvailable={micAvailable} />
      </div>

      {mode === "voice" && (
        <VoiceAnswerPanel
          micAvailable={micAvailable}
          micActive={micActive}
          micPaused={micPaused}
          micError={micError}
          errorKey={errorKey}
          disabled={disabled}
          canFinish={canFinish}
          listeningSilent={listeningSilent}
          recordingSeconds={recordingSeconds}
          onStart={onStart}
          onPause={onPause}
          onResume={onResume}
          onFinish={onFinish}
          onCancel={onCancel}
          onRetry={onRetry}
        />
      )}
    </div>
  );
}
