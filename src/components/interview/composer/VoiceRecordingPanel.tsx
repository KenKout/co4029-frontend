import { useTranslation } from "react-i18next";
import { Mic, Pause } from "lucide-react";

import { formatRelativeInterviewTime } from "@/lib/interview/format";
import { cn } from "@/lib/utils";
import { VoiceRecordingActions } from "./VoiceRecordingActions";
import { VoiceWaveform } from "./VoiceWaveform";

/** Active/paused branch of the voice panel: status header, meter, controls. */
export function VoiceRecordingPanel({
  micActive,
  listeningSilent,
  recordingSeconds,
  canFinish,
  disabled,
  onPause,
  onResume,
  onFinish,
  onCancel,
}: {
  micActive: boolean;
  listeningSilent: boolean;
  recordingSeconds: number;
  canFinish: boolean;
  disabled?: boolean;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full",
            micActive ? "bg-primary text-white" : "bg-warning/10 text-warning",
          )}
          aria-hidden="true"
        >
          {micActive ? (
            <Mic className="h-5 w-5" />
          ) : (
            <Pause className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-text-strong">
            {micActive
              ? t("course_interview.workspace.listening_short")
              : t("course_interview.workspace.recording_paused")}
          </p>
          <p
            className={cn(
              "text-xs",
              listeningSilent ? "font-medium text-warning" : "text-text-muted",
            )}
          >
            {listeningSilent
              ? t("course_interview.workspace.listening_silent_hint")
              : t("course_interview.workspace.live_transcript_hint")}
          </p>
        </div>
        <time className="font-mono text-sm font-semibold tabular-nums text-primary">
          {formatRelativeInterviewTime(recordingSeconds)}
        </time>
      </div>

      <VoiceWaveform micActive={micActive} />

      <VoiceRecordingActions
        micActive={micActive}
        canFinish={canFinish}
        disabled={disabled}
        onPause={onPause}
        onResume={onResume}
        onFinish={onFinish}
        onCancel={onCancel}
      />
    </div>
  );
}
