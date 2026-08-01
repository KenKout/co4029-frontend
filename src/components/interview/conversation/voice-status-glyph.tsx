/**
 * The animated glyph in front of `<VoiceStatusIndicator>`'s label.
 *
 * Extracted verbatim from `conversation.tsx`: every state's element, class
 * string, inline animation delay and duration is unchanged. It carried five of
 * the indicator's branches on its own.
 */
import { CircleAlert, Pause, WifiOff } from "lucide-react";

import type { InterviewAgentStatus } from "@/lib/interview/types";
import { cn } from "@/lib/utils";

export function VoiceStatusGlyph({
  status,
  animated,
  compact,
}: {
  status: InterviewAgentStatus;
  animated: boolean;
  compact: boolean;
}) {
  return (
    <span
      className={cn(
        "flex h-7 shrink-0 items-center justify-center gap-0.5",
        compact ? "w-5" : "w-9",
      )}
      aria-hidden="true"
    >
      {status === "thinking" ? (
        // B-Tier-1 #14: calm staggered pulse so a silent "thinking" beat reads
        // as the interviewer composing, never as a frozen UI.
        <span className="flex items-center gap-1">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="size-1.5 rounded-full bg-primary/80 motion-safe:animate-pulse"
              style={{
                animationDelay: `${dot * 200}ms`,
                animationDuration: "1s",
              }}
            />
          ))}
        </span>
      ) : animated ? (
        // B-Tier-1 #14: a varied waveform reads as live audio (speaking /
        // listening) rather than a flat, uniform bar set.
        [0, 1, 2, 3, 4].map((bar) => (
          <span
            key={bar}
            className={cn(
              "w-0.5 rounded-full bg-primary motion-safe:animate-pulse",
              ["h-2", "h-4", "h-3", "h-5", "h-2.5"][bar],
            )}
            style={{
              animationDelay: `${bar * 110}ms`,
              animationDuration: "0.9s",
            }}
          />
        ))
      ) : status === "error" ? (
        <CircleAlert className="h-4 w-4" />
      ) : status === "disconnected" ? (
        <WifiOff className="h-4 w-4" />
      ) : status === "paused" ? (
        <Pause className="h-4 w-4 text-warning" />
      ) : (
        <span className="h-2 w-2 rounded-full bg-border-strong" />
      )}
    </span>
  );
}
