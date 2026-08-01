import { useTranslation } from "react-i18next";
import { Mic } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Idle branch of the voice panel: the "start answering" call to action. */
export function VoiceIdlePrompt({
  micAvailable,
  disabled,
  onStart,
}: {
  micAvailable: boolean;
  disabled?: boolean;
  onStart: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center py-2 text-center">
      <Button
        type="button"
        size="lg"
        onClick={onStart}
        disabled={!micAvailable || disabled}
        className="min-h-12 rounded-full px-5"
      >
        <Mic className="h-5 w-5" />
        {t("course_interview.workspace.start_answering")}
      </Button>
      <p className="mt-2 text-xs text-text-muted">
        {t("course_interview.workspace.microphone_idle_hint")}
      </p>
    </div>
  );
}
