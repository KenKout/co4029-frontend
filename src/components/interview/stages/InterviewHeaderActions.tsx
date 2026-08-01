import { useTranslation } from "react-i18next";
import { PhoneOff, Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The narration toggle and the end-interview button in the header's trailing
 * cell. Both are optional, so this renders a fragment. */
export function InterviewHeaderActions({
  voiceOn,
  onToggleVoice,
  showVoiceControl,
  onEndInterview,
  endInterviewDisabled,
}: {
  voiceOn: boolean;
  onToggleVoice: () => void;
  showVoiceControl: boolean;
  onEndInterview: (() => void) | undefined;
  endInterviewDisabled: boolean;
}) {
  const { t } = useTranslation();

  return (
    <>
      {showVoiceControl && (
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          onClick={onToggleVoice}
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
          className={cn(
            "size-11 rounded-lg sm:size-9",
            voiceOn ? "text-primary" : "bg-surface-muted text-text-muted",
          )}
        >
          {voiceOn ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </Button>
      )}
      {onEndInterview && (
        <Button
          type="button"
          variant="destructive"
          size="icon-lg"
          onClick={onEndInterview}
          disabled={endInterviewDisabled}
          className="size-11 rounded-lg text-danger disabled:cursor-not-allowed disabled:opacity-50 sm:size-9"
          aria-label={t("course_interview.actions.end_interview")}
          title={t("course_interview.actions.end_interview")}
        >
          <PhoneOff className="h-4 w-4" />
        </Button>
      )}
    </>
  );
}
