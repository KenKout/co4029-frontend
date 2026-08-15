import { Check, Mic, MicOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

import { ChecklistRow } from "./checklist-row";
import type { ChecklistItemState, SetupActionHandler } from "./setup-stages";

export function AudioRow({
  state,
  micConnected,
  micPermission,
  disabled,
  onAction,
  onRequestMic,
}: {
  state: ChecklistItemState;
  micConnected: boolean;
  /** Raw permission state; `"prompt"` means the browser has not asked yet. */
  micPermission?: "granted" | "prompt" | "denied" | null;
  disabled: boolean;
  onAction: SetupActionHandler;
  /** Fire the browser permission prompt (the setup flow's own ask). */
  onRequestMic?: () => void;
}) {
  const { t } = useTranslation();
  const awaitingPermission =
    state === "active" && !micConnected && micPermission === "prompt";
  return (
    <ChecklistRow
      state={state}
      icon={
        micConnected ? (
          <Mic className="h-4 w-4" />
        ) : (
          <MicOff className="h-4 w-4" />
        )
      }
      label={t("course_interview.setup.microphone")}
      value={
        micConnected && micPermission === "granted"
          ? t("course_interview.setup.mic_connected")
          : micPermission === "denied"
            ? t("course_interview.setup.mic_blocked")
            : micPermission === "prompt"
              ? t("course_interview.setup.mic_prompt")
              : t("course_interview.setup.mic_unavailable")
      }
    >
      {awaitingPermission ? (
        // The stage's confirm actions ("mic is clear") make no sense before the
        // browser has even asked: permission is the gate this row exists to
        // clear, during setup rather than mid-interview.
        <Button
          type="button"
          size="lg"
          disabled={disabled || !onRequestMic}
          onClick={() => onRequestMic?.()}
          className="min-h-11 rounded-lg"
        >
          <Mic className="h-4 w-4" />
          {t("course_interview.setup.mic_enable")}
        </Button>
      ) : (
        state === "active" && (
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
        )
      )}
    </ChecklistRow>
  );
}
