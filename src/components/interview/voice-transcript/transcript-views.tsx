/**
 * The read-only surfaces of the LiveKit voice transcript: one drawer row, the
 * prominent current-question card, the idle placeholder, the latest-answer
 * card, and the transcript drawer itself.
 *
 * Every element, class string, aria attribute and i18n key is unchanged from
 * `voice-transcript.tsx`; only the component boundaries are new.
 */
import { Bot, Check, MessageSquareText } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { DisplayItem } from "@/components/interview/voice-transcript/display-items";
import { formatRelativeInterviewTime } from "@/lib/interview/format";
import { cn } from "@/lib/utils";

export function TranscriptItem({ item }: { item: DisplayItem }) {
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

/** The current AI turn, rendered as the page's focal question card. */
export function CurrentQuestionCard({ item }: { item: DisplayItem }) {
  const { t } = useTranslation();
  return (
    <article className="rounded-2xl border border-border bg-white px-5 py-5 shadow-editorial sm:px-7 sm:py-7">
      <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-primary">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary-soft">
          <Bot className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        {t("course_interview.workspace.ai_interviewer")}
        {item.elapsedSeconds !== undefined && (
          <time className="ml-auto font-medium normal-case tracking-normal text-text-subtle">
            {formatRelativeInterviewTime(item.elapsedSeconds)}
          </time>
        )}
      </div>
      <p
        className={cn(
          "max-w-[44rem] whitespace-pre-wrap text-[21px] font-semibold leading-[1.5] text-text-strong sm:text-2xl",
          !item.isFinal && "text-text-muted",
        )}
      >
        {item.text}
      </p>
    </article>
  );
}

/** Shown until the agent has said anything at all. */
export function IdleQuestionPlaceholder() {
  const { t } = useTranslation();
  return (
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
  );
}

/** Clamped echo of the candidate's most recent answer. */
export function LatestAnswerCard({ item }: { item: DisplayItem }) {
  const { t } = useTranslation();
  return (
    <div
      className="rounded-xl border border-border bg-white px-4 py-3"
      aria-live="polite"
    >
      <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-text-muted">
        <Check className="h-3.5 w-3.5 text-success" />
        {t("course_interview.workspace.latest_answer")}
      </div>
      <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-text-body">
        {item.text}
      </p>
    </div>
  );
}

/** Full-history drawer plus its trigger row. */
export function TranscriptDrawer({
  open,
  onOpenChange,
  displayItems,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayItems: DisplayItem[];
}) {
  const { t } = useTranslation();
  return (
    <div className="flex justify-end">
      <Sheet open={open} onOpenChange={onOpenChange}>
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
  );
}
