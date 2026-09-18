import { useTranslation } from "react-i18next";
import { Wifi, WifiOff } from "lucide-react";

import { cn } from "@/lib/utils";

/** Connection pill plus the elapsed / expected clock in the header's trailing
 * cell. */
export function InterviewHeaderStatus({
  connected,
  timerActive,
  elapsed,
  expected,
}: {
  connected: boolean;
  timerActive: boolean;
  elapsed: string;
  expected: string | null;
}) {
  const { t } = useTranslation();

  return (
    <>
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
    </>
  );
}
