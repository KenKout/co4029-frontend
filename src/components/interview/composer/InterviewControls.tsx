import { useTranslation } from "react-i18next";
import {
  AudioLines,
  Check,
  ChevronDown,
  Clock3,
  MessageSquareText,
  Mic,
  MicOff,
  MoreHorizontal,
  PhoneOff,
} from "lucide-react";

import { VoiceStatusIndicator } from "@/components/interview/conversation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { InterviewAgentStatus } from "@/lib/interview/types";
import { ComposerControl } from "./ComposerControl";

export function InterviewControls({
  micAvailable,
  micActive,
  onMicToggle,
  transcriptOpen,
  onTranscriptToggle,
  elapsed,
  status,
  onEndInterview,
  disabled,
}: {
  micAvailable: boolean;
  micActive: boolean;
  onMicToggle: () => void;
  transcriptOpen: boolean;
  onTranscriptToggle: () => void;
  elapsed: string;
  status: InterviewAgentStatus;
  onEndInterview: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const micLabel = micAvailable
    ? micActive
      ? t("course_interview.workspace.mute_microphone")
      : t("course_interview.workspace.start_speaking")
    : t("course_interview.hybrid.unsupported");

  return (
    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
      <ComposerControl
        label={micLabel}
        active={micActive}
        disabled={!micAvailable || disabled}
        onClick={onMicToggle}
      >
        {micActive ? (
          <Mic className="h-4 w-4" />
        ) : (
          <MicOff className="h-4 w-4" />
        )}
      </ComposerControl>

      <div className="hidden items-center gap-1.5 sm:flex">
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={!micAvailable}
            className="inline-flex h-9 items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-text-muted outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={t("course_interview.workspace.audio_input")}
            title={t("course_interview.workspace.system_microphone")}
          >
            <AudioLines className="h-4 w-4" />
            <span className="hidden max-w-28 truncate lg:inline">
              {t("course_interview.workspace.system_microphone")}
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 lg:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="top"
            sideOffset={10}
            className="w-52"
          >
            <DropdownMenuItem className="gap-2 px-3 py-2">
              <AudioLines className="h-4 w-4" />
              {t("course_interview.workspace.system_microphone")}
              <Check className="ml-auto h-4 w-4 text-primary" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ComposerControl
          label={
            transcriptOpen
              ? t("course_interview.workspace.hide_transcript")
              : t("course_interview.workspace.show_transcript")
          }
          active={transcriptOpen}
          onClick={onTranscriptToggle}
        >
          <MessageSquareText className="h-4 w-4" />
        </ComposerControl>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex size-9 items-center justify-center rounded-lg text-text-muted outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary/60 sm:hidden"
          aria-label={t("course_interview.workspace.more_controls")}
          title={t("course_interview.workspace.more_controls")}
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          sideOffset={10}
          className="w-52"
        >
          <DropdownMenuItem
            onClick={onTranscriptToggle}
            className="gap-2 px-3 py-2"
          >
            <MessageSquareText className="h-4 w-4" />
            {transcriptOpen
              ? t("course_interview.workspace.hide_transcript")
              : t("course_interview.workspace.show_transcript")}
            {transcriptOpen && (
              <Check className="ml-auto h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="gap-2 px-3 py-2">
            <AudioLines className="h-4 w-4" />
            {t("course_interview.workspace.system_microphone")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <VoiceStatusIndicator
        status={status}
        compact
        className="hidden sm:flex"
      />

      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        <span className="inline-flex h-9 items-center gap-1.5 px-1 font-mono text-xs font-semibold tabular-nums text-text-muted sm:px-2">
          <Clock3 className="hidden h-3.5 w-3.5 sm:block" />
          {elapsed}
        </span>
        <Button
          type="button"
          variant="destructive"
          size="lg"
          onClick={onEndInterview}
          disabled={disabled}
          className="h-9 rounded-lg px-2.5 text-danger hover:bg-danger/10 sm:px-3"
          aria-label={t("course_interview.actions.end_interview")}
          title={t("course_interview.actions.end_interview")}
        >
          <PhoneOff className="h-4 w-4" />
          <span className="hidden md:inline">
            {t("course_interview.actions.end_interview")}
          </span>
        </Button>
      </div>
    </div>
  );
}
