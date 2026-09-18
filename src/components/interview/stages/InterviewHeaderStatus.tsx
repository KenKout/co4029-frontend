import { useTranslation } from "react-i18next";
import { Camera, Wifi, WifiOff } from "lucide-react";

import { cn } from "@/lib/utils";

/** Connection pill plus the elapsed / expected clock in the header's trailing
 * cell. */
export function InterviewHeaderStatus({
  connected,
  timerActive,
  elapsed,
  expected,
  cameraOn = false,
}: {
  connected: boolean;
  timerActive: boolean;
  elapsed: string;
  expected: string | null;
  /** Live local camera (FE-only gate); shows the camera-on pill when true. */
  cameraOn?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "hidden items-center gap-1.5 text-xs font-medium sm:inline-flex",
            connected ? "text-text-muted" : "text-danger",
          )}
          title={
            connected
              ? t("course_interview.workspace.connected")
              : t("course_interview.workspace.connection_interrupted")
          }
        >
          {connected ? (
            <Wifi className="h-3.5 w-3.5" />
          ) : (
            <WifiOff className="h-3.5 w-3.5" />
          )}
          <span className="hidden xl:inline">
            {connected
              ? t("course_interview.workspace.connected")
              : t("course_interview.workspace.disconnected")}
          </span>
        </span>
        <time
          className="min-w-[5.5rem] text-center font-mono text-xs font-semibold tabular-nums text-text-muted sm:min-w-[7.5rem]"
          aria-label={t("course_interview.workspace.elapsed_time")}
        >
          {timerActive ? elapsed : "--:--"}
          {expected ? ` / ${expected}` : ""}
        </time>
      </div>
      {cameraOn && (
        <div className="flex items-center gap-1.5">
          <span
            className="hidden items-center gap-1.5 text-xs font-medium text-text-muted sm:inline-flex"
            title={t("course_interview.workspace.camera_on")}
          >
            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden xl:inline">
              {t("course_interview.workspace.camera_on")}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
