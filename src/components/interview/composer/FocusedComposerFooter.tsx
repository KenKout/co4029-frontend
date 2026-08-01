import { useTranslation } from "react-i18next";
import { MessageSquareText, PhoneOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SendHint } from "./SendHint";

/** Keycap hint plus the mobile-only timer, transcript and end-call actions. */
export function FocusedComposerFooter({
  elapsed,
  transcriptOpen,
  onTranscriptToggle,
  onEndInterview,
}: {
  elapsed: string;
  transcriptOpen: boolean;
  onTranscriptToggle: () => void;
  onEndInterview: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="mt-2 flex items-center gap-2 text-[11px] text-text-subtle">
      {/* A11y (#8): keyboard-shortcut hint is discoverable at every
          breakpoint (was hidden on mobile). Keys read as keys, not prose —
          and the standalone <kbd>Enter</kbd> that used to sit beside the
          sentence is gone, since SendHint now renders every key itself. */}
      <SendHint />
      <span className="ml-auto font-mono font-semibold tabular-nums sm:hidden">
        {elapsed}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        onClick={onTranscriptToggle}
        aria-pressed={transcriptOpen}
        className="size-11 sm:hidden"
        aria-label={t("course_interview.workspace.view_transcript")}
      >
        <MessageSquareText className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="icon-lg"
        onClick={onEndInterview}
        className="size-11 text-danger sm:hidden"
        aria-label={t("course_interview.actions.end_interview")}
      >
        <PhoneOff className="h-4 w-4" />
      </Button>
    </div>
  );
}
