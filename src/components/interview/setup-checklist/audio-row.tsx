import { Check, Mic } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

import { ChecklistRow } from "./checklist-row";
import type { ChecklistItemState, SetupActionHandler } from "./setup-stages";

export function AudioRow({
  state,
  micConnected,
  disabled,
  onAction,
}: {
  state: ChecklistItemState;
  micConnected: boolean;
  disabled: boolean;
  onAction: SetupActionHandler;
}) {
  const { t } = useTranslation();
  return (
    <ChecklistRow
      state={state}
      icon={<Mic className="h-4 w-4" />}
      label={t("course_interview.setup.microphone")}
      value={
        micConnected
          ? t("course_interview.setup.mic_connected")
          : t("course_interview.setup.mic_unavailable")
      }
    >
      {state === "active" && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="lg"
            disabled={disabled}
            onClick={() => onAction("audio_clear")}
            className="min-h-11 rounded-lg"
          >
            <Check className="h-4 w-4" />
            {t("course_interview.onboarding.audio_clear")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={disabled}
            onClick={() => onAction("needs_adjustment")}
            className="min-h-11 rounded-lg"
          >
            {t("course_interview.onboarding.need_moment")}
          </Button>
        </div>
      )}
    </ChecklistRow>
  );
}
