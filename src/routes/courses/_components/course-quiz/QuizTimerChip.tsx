import { AlertTriangle, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/quiz/quiz-session-helpers";
import type { QuizSession } from "./types";

/**
 * The timed-quiz countdown, shared by the mobile and desktop take bars.
 *
 * - normal: primary colour while there's time
 * - last 10 seconds: red + breathing (pulse)
 * - past zero: red count-UP with an exclamation mark (the attempt is
 *   auto-submitting or the student is overtime)
 *
 * The one-shot 10s toast warning lives in the taking stage (this chip
 * renders twice — mobile + desktop variants — so a toast here would fire
 * twice).
 */
export function QuizTimerChip({
  session,
  timeLimitSeconds,
}: {
  session: QuizSession;
  timeLimitSeconds: number | null | undefined;
}) {
  const { timeLeft, sessionReady } = session;

  const secondsLeft = sessionReady
    ? timeLeft
    : (timeLimitSeconds ?? 0);
  const overtime = secondsLeft <= 0;
  const low = !overtime && secondsLeft <= 10;

  if (!timeLimitSeconds) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-xl px-3 py-2 font-mono font-bold text-sm tabular-nums",
        overtime
          ? "bg-red-50 text-red-600"
          : low
            ? "bg-red-50 text-red-600 animate-pulse"
            : "bg-m3-primary-fixed/40 text-m3-primary",
      )}
    >
      {overtime ? (
        <AlertTriangle className="h-4 w-4 shrink-0" />
      ) : (
        <Timer className="h-4 w-4 shrink-0" />
      )}
      {formatTime(overtime ? Math.abs(secondsLeft) : secondsLeft)}
    </div>
  );
}
