import { useTranslation } from "react-i18next";
import { Check, Pause, Play, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Pause/Resume, Finish and Cancel row for an in-progress recording. */
export function VoiceRecordingActions({
  micActive,
  canFinish,
  disabled,
  onPause,
  onResume,
  onFinish,
  onCancel,
}: {
  micActive: boolean;
  canFinish: boolean;
  disabled?: boolean;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {micActive ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onPause}
          className="min-h-11"
        >
          <Pause className="h-4 w-4" />
          {t("course_interview.workspace.pause_recording")}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onResume}
          className="min-h-11"
        >
          <Play className="h-4 w-4" />
          {t("course_interview.workspace.resume_recording")}
        </Button>
      )}
      <Button
        type="button"
        size="lg"
        onClick={onFinish}
        disabled={!canFinish || disabled}
        className="min-h-11 px-4"
      >
        <Check className="h-4 w-4" />
        {t("course_interview.workspace.finish_answer")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        onClick={onCancel}
        className="size-11 text-text-muted hover:text-danger"
        aria-label={t("course_interview.workspace.cancel_recording")}
        title={t("course_interview.workspace.cancel_recording")}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
