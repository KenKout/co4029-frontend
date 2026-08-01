/**
 * The pieces of one `<ConversationMessage>` bubble: the AI avatar, the AI
 * header (kind badge, timestamp, replay), the candidate header, and the body.
 *
 * Split out of `conversation.tsx` with the JSX, class strings, aria attributes
 * and i18n keys moved character for character. Each piece renders the same root
 * element it did inline, so the DOM shape of a turn is unchanged.
 */
import { useTranslation } from "react-i18next";
import { Bot, Loader2, Volume2 } from "lucide-react";

import { AiTypingMessage } from "@/components/interview/ai-typing-message";
import { presentationKindForTurn } from "@/components/interview/conversation/turn-meta";
import { Button } from "@/components/ui/button";
import { turnKindVisual } from "@/lib/interview/format";
import type { NarrationPresentation } from "@/lib/hooks/use-interview-narration";
import type { ConversationTurn } from "@/lib/interview/types";
import { cn } from "@/lib/utils";

export function MessageAvatar({ turn }: { turn: ConversationTurn }) {
  const kindVisual = turnKindVisual(turn.kind);
  const AvatarIcon = kindVisual?.icon ?? Bot;
  return (
    <div
      className={cn(
        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border",
        kindVisual?.avatarClass ??
          "border-primary/15 bg-primary-soft text-primary",
      )}
    >
      <AvatarIcon className="h-4 w-4" aria-hidden="true" />
    </div>
  );
}

/**
 * B-Tier-1 #12: colored kind badge (hint/clarification/followup/wrap-up) so the
 * transcript is scannable. Falls back to the question-type label pill for plain
 * question/opening turns.
 */
function TurnKindBadge({
  turn,
  label,
}: {
  turn: ConversationTurn;
  label?: string | null;
}) {
  const { t } = useTranslation();
  const kindVisual = turnKindVisual(turn.kind);
  if (kindVisual) {
    return (
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
          kindVisual.badgeClass,
        )}
      >
        {t(kindVisual.labelKey)}
      </span>
    );
  }
  if (turn.isFollowUp) {
    return (
      <span className="text-[11px] font-medium text-text-subtle">
        {t("course_interview.sections.follow_up")}
      </span>
    );
  }
  if (label) {
    return (
      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </span>
    );
  }
  return null;
}

function ReplayTurnButton({
  isReplaying,
  replayDisabled,
  showTimestamp,
  onReplay,
}: {
  isReplaying: boolean;
  replayDisabled: boolean;
  showTimestamp: boolean;
  onReplay?: () => void;
}) {
  const { t } = useTranslation();
  const label = isReplaying
    ? t("course_interview.workspace.replaying_message")
    : t("course_interview.workspace.replay_message");
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={replayDisabled}
      onClick={onReplay}
      aria-label={label}
      title={label}
      className={cn(
        "size-7 shrink-0 rounded-full text-text-muted hover:bg-primary-soft hover:text-primary disabled:opacity-40",
        !showTimestamp && "ml-auto",
      )}
    >
      {isReplaying ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </Button>
  );
}

export function AiMessageHeader({
  turn,
  label,
  showTimestamp,
  relativeTime,
  replayVisible,
  replayDisabled,
  isReplaying,
  onReplay,
}: {
  turn: ConversationTurn;
  label?: string | null;
  showTimestamp: boolean;
  relativeTime: string;
  replayVisible: boolean;
  replayDisabled: boolean;
  isReplaying: boolean;
  onReplay?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-text-strong">
        {t("course_interview.workspace.ai_interviewer")}
      </span>
      <TurnKindBadge turn={turn} label={label} />
      {showTimestamp && (
        <time className="ml-auto text-[11px] font-medium tabular-nums text-text-subtle">
          {relativeTime}
        </time>
      )}
      {replayVisible && (
        <ReplayTurnButton
          isReplaying={isReplaying}
          replayDisabled={replayDisabled}
          showTimestamp={showTimestamp}
          onReplay={onReplay}
        />
      )}
    </div>
  );
}

export function UserMessageHeader({
  showTimestamp,
  relativeTime,
}: {
  showTimestamp: boolean;
  relativeTime: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-medium text-text-muted">
      <span>{t("course_interview.workspace.you")}</span>
      {showTimestamp && (
        <time className="tabular-nums text-text-subtle">{relativeTime}</time>
      )}
    </div>
  );
}

export function AiMessageBody({
  turn,
  isLatest,
  speak,
  onTick,
  onSpeakingChange,
  onTextComplete,
  onPresentationComplete,
}: {
  turn: ConversationTurn;
  isLatest: boolean;
  speak: (text: string) => void | Promise<void> | NarrationPresentation;
  onTick: () => void;
  onSpeakingChange: (speaking: boolean) => void;
  onTextComplete: () => void;
  onPresentationComplete?: () => void;
}) {
  return (
    <AiTypingMessage
      text={turn.text}
      animate={isLatest}
      speak={speak}
      onTick={onTick}
      onTypingChange={onSpeakingChange}
      onTextComplete={onTextComplete}
      onPresentationComplete={onPresentationComplete}
      presentationKind={presentationKindForTurn(turn)}
      className={cn(
        "min-w-0 text-text-strong",
        isLatest ? "text-lg leading-8 sm:text-xl" : "text-base leading-7",
      )}
    />
  );
}
