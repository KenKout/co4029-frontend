/**
 * Transcript surfaces: the shared turn list plus its two containers — an overlay
 * drawer (mobile / on-demand) and a docked side panel (desktop reflow).
 *
 * Extracted from `interview-workspace.tsx` (step 5 of that file's decomposition).
 * All three share one visibility rule from `lib/interview/transcript-visibility`
 * so a count can never lead the turn it counts.
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquareText, X } from "lucide-react";

import { ConversationMessage } from "@/components/interview/conversation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  visibleTranscriptCount,
  visibleTranscriptTurns,
} from "@/lib/interview/transcript-visibility";
import type { ConversationTurn } from "@/lib/interview/types";
import type { NarrationPresentation } from "@/lib/hooks/use-interview-narration";
import { cn } from "@/lib/utils";

/**
 * Scrollable transcript body shared by the mobile Sheet drawer and the desktop
 * docked panel. Owns the "don't auto-scroll when the user has scrolled away
 * from the bottom" behaviour (spec §5) so both surfaces get it for free.
 */
function TranscriptConversation({
  transcript,
  presentedAiTurnIds,
  questionTypeLabel,
  speak,
  onSpeakingChange,
  onReplay,
  replayDisabled,
  replayingTurnId,
  className,
}: {
  transcript: ConversationTurn[];
  /** Ids of AI turns whose presentation finished. Absent → show everything. */
  presentedAiTurnIds?: ReadonlySet<string>;
  questionTypeLabel: (type: string | null | undefined) => string | null;
  speak: (text: string) => void | Promise<void> | NarrationPresentation;
  onSpeakingChange: (speaking: boolean) => void;
  onReplay: (turn: ConversationTurn) => void;
  replayDisabled: boolean;
  replayingTurnId: string | null;
  className?: string;
}) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  // Only auto-scroll to newest when the user is already pinned to the bottom.
  const pinnedToBottomRef = useRef(true);

  // Every turn here renders with `isLatest={false}`, which makes AiTypingMessage
  // skip animation and paint the full text at once. A question the interviewer
  // has not finished reading is already in `transcript` (the route appends it
  // before narration), so without this filter it appeared here in full while
  // the main stage was still on its "preparing" indicator.
  const visibleTurns = useMemo(
    () =>
      presentedAiTurnIds
        ? visibleTranscriptTurns(transcript, presentedAiTurnIds)
        : transcript,
    [transcript, presentedAiTurnIds],
  );

  const handleScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    pinnedToBottomRef.current = distanceFromBottom < 48;
  }, []);

  useEffect(() => {
    if (pinnedToBottomRef.current) {
      // jsdom (test env) doesn't implement scrollIntoView; guard so the
      // auto-scroll effect stays a no-op there instead of throwing.
      endRef.current?.scrollIntoView?.({ block: "nearest" });
    }
  }, [visibleTurns]);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className={cn(
        "min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-5",
        className,
      )}
    >
      {visibleTurns.length === 0 ? (
        <p className="py-12 text-center text-sm text-text-muted">
          {t("course_interview.workspace.transcript_empty")}
        </p>
      ) : (
        visibleTurns.map((turn) => (
          <ConversationMessage
            key={turn.id}
            turn={turn}
            label={questionTypeLabel(turn.questionType)}
            isLatest={false}
            speak={speak}
            onTick={() => undefined}
            onSpeakingChange={onSpeakingChange}
            replayVisible={turn.role === "ai"}
            replayDisabled={replayDisabled || replayingTurnId !== null}
            isReplaying={replayingTurnId === turn.id}
            onReplay={() => onReplay(turn)}
          />
        ))
      )}
      <div ref={endRef} />
    </div>
  );
}

export function TranscriptDrawer({
  open,
  onOpenChange,
  transcript,
  presentedAiTurnIds,
  questionTypeLabel,
  speak,
  onSpeakingChange,
  onReplay,
  replayDisabled,
  replayingTurnId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transcript: ConversationTurn[];
  /** Ids of AI turns whose presentation finished. Absent → show everything. */
  presentedAiTurnIds?: ReadonlySet<string>;
  questionTypeLabel: (type: string | null | undefined) => string | null;
  speak: (text: string) => void | Promise<void> | NarrationPresentation;
  onSpeakingChange: (speaking: boolean) => void;
  onReplay: (turn: ConversationTurn) => void;
  replayDisabled: boolean;
  replayingTurnId: string | null;
}) {
  const { t } = useTranslation();
  // Derived from the same rule as the list, so the badge/count can never lead
  // the turn it is counting (which would re-introduce the "showed early" tell).
  const visibleCount = presentedAiTurnIds
    ? visibleTranscriptCount(transcript, presentedAiTurnIds)
    : transcript.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-11 rounded-lg bg-white"
          />
        }
      >
        <MessageSquareText className="h-4 w-4" />
        {t("course_interview.workspace.view_transcript")}
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-text-muted">
          {visibleCount}
        </span>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full max-w-none gap-0 border-border bg-white sm:max-w-lg"
        aria-label={t("course_interview.workspace.transcript")}
      >
        <header className="shrink-0 border-b border-border px-5 py-5 pr-14">
          <h2 className="text-base font-semibold text-text-strong">
            {t("course_interview.workspace.transcript")}
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            {t("course_interview.workspace.transcript_count", {
              count: visibleCount,
            })}
          </p>
        </header>
        <TranscriptConversation
          transcript={transcript}
          presentedAiTurnIds={presentedAiTurnIds}
          questionTypeLabel={questionTypeLabel}
          speak={speak}
          onSpeakingChange={onSpeakingChange}
          onReplay={onReplay}
          replayDisabled={replayDisabled}
          replayingTurnId={replayingTurnId}
        />
      </SheetContent>
    </Sheet>
  );
}

/**
 * Desktop-only docked transcript panel (spec §10). Instead of overlaying and
 * cutting off the right edge of the Question Card, this renders in-flow so the
 * main workspace reflows into the remaining width. Rendered beside the main
 * column by the page layout; hidden on mobile where the Sheet drawer is used.
 */
export function TranscriptPanel({
  open,
  onClose,
  transcript,
  presentedAiTurnIds,
  questionTypeLabel,
  speak,
  onSpeakingChange,
  onReplay,
  replayDisabled,
  replayingTurnId,
}: {
  open: boolean;
  onClose: () => void;
  transcript: ConversationTurn[];
  /** Ids of AI turns whose presentation finished. Absent → show everything. */
  presentedAiTurnIds?: ReadonlySet<string>;
  questionTypeLabel: (type: string | null | undefined) => string | null;
  speak: (text: string) => void | Promise<void> | NarrationPresentation;
  onSpeakingChange: (speaking: boolean) => void;
  onReplay: (turn: ConversationTurn) => void;
  replayDisabled: boolean;
  replayingTurnId: string | null;
}) {
  const { t } = useTranslation();
  const visibleCount = presentedAiTurnIds
    ? visibleTranscriptCount(transcript, presentedAiTurnIds)
    : transcript.length;
  if (!open) return null;

  return (
    <aside
      className="hidden w-[380px] shrink-0 flex-col border-l border-border bg-white lg:flex xl:w-[420px]"
      aria-label={t("course_interview.workspace.transcript")}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-strong">
            {t("course_interview.workspace.transcript")}
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">
            {t("course_interview.workspace.transcript_count", {
              count: visibleCount,
            })}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="size-9 shrink-0 rounded-lg text-text-muted"
          aria-label={t("course_interview.workspace.hide_transcript")}
          title={t("course_interview.workspace.hide_transcript")}
        >
          <X className="h-4 w-4" />
        </Button>
      </header>
      <TranscriptConversation
        transcript={transcript}
        presentedAiTurnIds={presentedAiTurnIds}
        questionTypeLabel={questionTypeLabel}
        speak={speak}
        onSpeakingChange={onSpeakingChange}
        onReplay={onReplay}
        replayDisabled={replayDisabled}
        replayingTurnId={replayingTurnId}
      />
    </aside>
  );
}
