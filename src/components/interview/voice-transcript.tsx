/**
 * Displays a live transcript of the voice interview — agent and student turns.
 *
 * Agent turns: from useVoiceAssistant().agentTranscriptions
 *   → type ReceivedTranscriptionSegment with fields: id, text, final, firstReceivedTime
 *
 * Student turns: from useTranscriptions() (TextStreamData[])
 *   → type TextStreamData with fields: text, participantInfo, streamInfo
 *   Agent segments are filtered out by checking participantInfo.identity against the agent identity.
 */
import { useEffect, useRef } from "react";
import { useVoiceAssistant, useTranscriptions } from "@livekit/components-react";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceTranscriptProps {
  className?: string;
}

export function VoiceTranscript({ className }: VoiceTranscriptProps) {
  const { agentTranscriptions, agent } = useVoiceAssistant();
  // useTranscriptions() with no opts returns TextStreamData[] for all participants
  const allStreams = useTranscriptions();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentTranscriptions, allStreams]);

  // Agent identity for filtering student streams
  const agentIdentity = agent?.identity;

  // Agent turns: ReceivedTranscriptionSegment has id, text, final, firstReceivedTime
  const agentItems = agentTranscriptions.map((seg) => ({
    key: `agent-${seg.id}`,
    role: "agent" as const,
    text: seg.text,
    sortTime: seg.firstReceivedTime,
    isFinal: seg.final,
  }));

  // Student turns: TextStreamData has text, participantInfo, streamInfo
  // Exclude any stream from the agent participant
  const studentItems = allStreams
    .filter((stream) => stream.participantInfo.identity !== agentIdentity)
    .map((stream) => ({
      key: `student-${stream.streamInfo.id}`,
      role: "student" as const,
      text: stream.text,
      // streamInfo.timestamp is the creation time (milliseconds)
      sortTime: stream.streamInfo.timestamp,
      isFinal: true,
    }));

  const merged = [...agentItems, ...studentItems].sort(
    (a, b) => a.sortTime - b.sortTime,
  );

  if (merged.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center py-8 text-m3-on-surface-variant text-sm",
          className,
        )}
      >
        <Bot className="h-4 w-4 mr-2 opacity-50" />
        Waiting for conversation to start…
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 overflow-y-auto max-h-72 pr-1", className)}>
      {merged.map((item) => (
        <div
          key={item.key}
          className={cn(
            "flex gap-2 items-start",
            item.role === "student" ? "justify-end" : "justify-start",
          )}
        >
          {item.role === "agent" && (
            <div className="w-6 h-6 rounded-full bg-m3-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="h-3 w-3 text-m3-primary" />
            </div>
          )}
          <div
            className={cn(
              "rounded-xl px-4 py-2.5 max-w-[78%] text-sm leading-relaxed",
              item.role === "agent"
                ? "bg-m3-surface-container border border-m3-outline-variant/20 text-m3-on-surface"
                : "bg-m3-primary text-white",
              !item.isFinal && "opacity-70 italic",
            )}
          >
            {item.text}
          </div>
          {item.role === "student" && (
            <div className="w-6 h-6 rounded-full bg-m3-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <User className="h-3 w-3 text-m3-primary" />
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
