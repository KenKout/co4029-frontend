/** Focused live transcript for the LiveKit voice interview. */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useTranscriptions,
  useVoiceAssistant,
} from "@livekit/components-react";
import { Bot, Check, MessageSquareText } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatRelativeInterviewTime } from "./interview-workspace";
import type { ConversationTurn } from "./interview-workspace";

interface VoiceTranscriptProps {
  className?: string;
  initialTurns?: ConversationTurn[];
  onTranscriptChange?: (turns: ConversationTurn[]) => void;
}

interface DisplayItem {
  key: string;
  role: "agent" | "student";
  text: string;
  isFinal: boolean;
  elapsedSeconds?: number;
  historyTurn?: ConversationTurn | null;
}

function TranscriptItem({ item }: { item: DisplayItem }) {
  const { t } = useTranslation();
  const isAgent = item.role === "agent";
  return (
    <article
      className={cn("flex gap-3", isAgent ? "justify-start" : "justify-end")}
      aria-label={
        isAgent
          ? t("course_interview.workspace.ai_interviewer")
          : t("course_interview.workspace.you")
      }
    >
      {isAgent && (
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary-soft text-primary">
          <Bot className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[86%] text-sm leading-6 sm:max-w-[80%]",
          isAgent
            ? "py-1 text-text-strong"
            : "rounded-xl border border-border bg-surface-muted px-4 py-3 text-text-body",
          !item.isFinal && "italic text-text-muted",
        )}
      >
        <div className="mb-1 flex items-center justify-between gap-4 text-xs font-semibold text-text-muted">
          <span>
            {isAgent
              ? t("course_interview.workspace.ai_interviewer")
              : t("course_interview.workspace.you")}
          </span>
          {item.elapsedSeconds !== undefined && (
            <time className="font-medium tabular-nums text-text-subtle">
              {formatRelativeInterviewTime(item.elapsedSeconds)}
            </time>
          )}
        </div>
        <p className="whitespace-pre-wrap">{item.text}</p>
      </div>
    </article>
  );
}

export function VoiceTranscript({
  className,
  initialTurns = [],
  onTranscriptChange,
}: VoiceTranscriptProps) {
  const { t } = useTranslation();
  const { agentTranscriptions, agent } = useVoiceAssistant();
  const allStreams = useTranscriptions();
  const emittedFingerprintRef = useRef("");
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const agentIdentity = agent?.identity;
  const merged = useMemo(
    () =>
      [
        ...agentTranscriptions.map((segment) => ({
          key: `agent-${segment.id}`,
          role: "agent" as const,
          text: segment.text,
          sortTime: segment.firstReceivedTime,
          isFinal: segment.final,
        })),
        ...allStreams
          .filter((stream) => stream.participantInfo.identity !== agentIdentity)
          .map((stream) => ({
            key: `student-${stream.streamInfo.id}`,
            role: "student" as const,
            text: stream.text,
            sortTime: stream.streamInfo.timestamp,
            isFinal: true,
          })),
      ].sort((first, second) => first.sortTime - second.sortTime),
    [agentIdentity, agentTranscriptions, allStreams],
  );

  const transcriptStartedAt = merged[0]?.sortTime ?? 0;
  const displayItems: DisplayItem[] = useMemo(() => {
    const initialElapsed = initialTurns.reduce(
      (latest, turn) => Math.max(latest, turn.elapsedSeconds ?? 0),
      0,
    );
    return [
      ...initialTurns.map((turn) => ({
        key: `history-${turn.id}`,
        role: turn.role === "ai" ? ("agent" as const) : ("student" as const),
        text: turn.text,
        isFinal: true,
        elapsedSeconds: turn.elapsedSeconds,
        historyTurn: turn,
      })),
      ...merged.map((item) => ({
        ...item,
        elapsedSeconds:
          initialElapsed +
          Math.max(0, Math.floor((item.sortTime - transcriptStartedAt) / 1000)),
        historyTurn: null,
      })),
    ];
  }, [initialTurns, merged, transcriptStartedAt]);

  useEffect(() => {
    if (!onTranscriptChange) return;
    const fingerprint = displayItems
      .map((item) => `${item.key}:${item.text}:${item.isFinal}`)
      .join("|");
    if (fingerprint === emittedFingerprintRef.current) return;
    emittedFingerprintRef.current = fingerprint;
    onTranscriptChange(
      displayItems.map(
        (item) =>
          item.historyTurn ?? {
            id: item.key,
            role: item.role === "agent" ? "ai" : "user",
            text: item.text,
            elapsedSeconds: item.elapsedSeconds,
            kind: item.role === "agent" ? "question" : "answer",
          },
      ),
    );
  }, [displayItems, onTranscriptChange]);

  const currentAi = useMemo(
    () =>
      [...displayItems].reverse().find((item) => item.role === "agent") ?? null,
    [displayItems],
  );
  const currentCandidate = useMemo(
    () =>
      [...displayItems].reverse().find((item) => item.role === "student") ??
      null,
    [displayItems],
  );

  return (
    <div className={cn("flex min-h-0 flex-col gap-4", className)}>
      {currentAi ? (
        <article className="rounded-2xl border border-border bg-white px-5 py-5 shadow-editorial sm:px-7 sm:py-7">
          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-primary">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary-soft">
              <Bot className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            {t("course_interview.workspace.ai_interviewer")}
            {currentAi.elapsedSeconds !== undefined && (
              <time className="ml-auto font-medium normal-case tracking-normal text-text-subtle">
                {formatRelativeInterviewTime(currentAi.elapsedSeconds)}
              </time>
            )}
          </div>
          <p
            className={cn(
              "max-w-[44rem] whitespace-pre-wrap text-[21px] font-semibold leading-[1.5] text-text-strong sm:text-2xl",
              !currentAi.isFinal && "text-text-muted",
            )}
          >
            {currentAi.text}
          </p>
        </article>
      ) : (
        <div
          className="rounded-2xl border border-border bg-white px-6 py-12 text-center text-sm text-text-muted"
          role="status"
        >
          <span
            className="mr-2 inline-block h-2 w-2 rounded-full bg-success"
            aria-hidden="true"
          />
          {t("course_interview.workspace.status.idle")}
        </div>
      )}

      {currentCandidate && (
        <div
          className="rounded-xl border border-border bg-white px-4 py-3"
          aria-live="polite"
        >
          <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-text-muted">
            <Check className="h-3.5 w-3.5 text-success" />
            {t("course_interview.workspace.latest_answer")}
          </div>
          <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-text-body">
            {currentCandidate.text}
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <Sheet open={transcriptOpen} onOpenChange={setTranscriptOpen}>
          <SheetTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="min-h-11"
              />
            }
          >
            <MessageSquareText className="h-4 w-4" />
            {t("course_interview.workspace.view_transcript")}
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-text-muted">
              {displayItems.length}
            </span>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-full max-w-none gap-0 bg-white sm:max-w-lg"
          >
            <header className="border-b border-border px-5 py-5 pr-14">
              <h2 className="text-base font-semibold text-text-strong">
                {t("course_interview.workspace.transcript")}
              </h2>
              <p className="mt-1 text-xs text-text-muted">
                {t("course_interview.workspace.transcript_count", {
                  count: displayItems.length,
                })}
              </p>
            </header>
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-5">
              {displayItems.map((item) => (
                <TranscriptItem key={item.key} item={item} />
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
