/** Live merged transcript for the LiveKit voice interview. */
import { useEffect, useRef } from "react";
import { useTranscriptions, useVoiceAssistant } from "@livekit/components-react";
import { Bot } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatRelativeInterviewTime } from "./interview-workspace";

interface VoiceTranscriptProps {
  className?: string;
}

export function VoiceTranscript({ className }: VoiceTranscriptProps) {
  const { agentTranscriptions, agent } = useVoiceAssistant();
  const allStreams = useTranscriptions();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [agentTranscriptions, allStreams]);

  const agentIdentity = agent?.identity;
  const agentItems = agentTranscriptions.map((segment) => ({
    key: `agent-${segment.id}`,
    role: "agent" as const,
    text: segment.text,
    sortTime: segment.firstReceivedTime,
    isFinal: segment.final,
  }));
  const studentItems = allStreams
    .filter((stream) => stream.participantInfo.identity !== agentIdentity)
    .map((stream) => ({
      key: `student-${stream.streamInfo.id}`,
      role: "student" as const,
      text: stream.text,
      sortTime: stream.streamInfo.timestamp,
      isFinal: true,
    }));
  const merged = [...agentItems, ...studentItems].sort(
    (first, second) => first.sortTime - second.sortTime,
  );
  const transcriptStartedAt = merged[0]?.sortTime ?? 0;

  if (merged.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-sm text-text-muted",
          className,
        )}
        role="status"
      >
        <span className="mr-2 h-2 w-2 rounded-full bg-success" aria-hidden="true" />
        AI interviewer is ready
      </div>
    );
  }

  return (
    <div
      className={cn("space-y-7 overflow-y-auto overscroll-contain pr-1", className)}
      aria-label="Live interview transcript"
    >
      {merged.map((item) => {
        const isAgent = item.role === "agent";
        const elapsedSeconds = Math.max(
          0,
          Math.floor((item.sortTime - transcriptStartedAt) / 1000),
        );
        return (
          <article
            key={item.key}
            className={cn("flex gap-3", isAgent ? "justify-start" : "justify-end")}
            aria-label={isAgent ? "AI interviewer" : "You"}
          >
            {isAgent && (
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary-soft text-primary">
                <Bot className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[82%] text-sm leading-6 sm:max-w-[76%] sm:text-base",
                isAgent
                  ? "py-1 text-text-strong"
                  : "rounded-xl border border-border bg-surface-muted px-4 py-3 text-text-body",
                !item.isFinal && "italic text-text-muted",
              )}
            >
              {isAgent && (
                <div className="mb-1 flex items-center justify-between gap-4 text-xs font-semibold text-text-muted">
                  <span>AI interviewer</span>
                  <time className="font-medium tabular-nums text-text-subtle">
                    {formatRelativeInterviewTime(elapsedSeconds)}
                  </time>
                </div>
              )}
              {!isAgent && (
                <div className="mb-1 flex items-center justify-between gap-4 text-xs font-semibold text-text-muted">
                  <span>You</span>
                  <time className="font-medium tabular-nums text-text-subtle">
                    {formatRelativeInterviewTime(elapsedSeconds)}
                  </time>
                </div>
              )}
              <p className="whitespace-pre-wrap">{item.text}</p>
            </div>
          </article>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
