import { useTranslation } from "react-i18next";
import { MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarColor,
  avatarInitials,
} from "@/components/ui/avatar";
import { timeAgo } from "@/lib/format/time-ago";
import type { DiscussionTopic } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * One topic, as a card in a board. Shared by the course-level board and the
 * lesson-level one — the two differ only in which list feeds them, so a
 * second copy would be a second place for the badge rules to drift.
 *
 * The whole card is the button. A row of small targets (title link, count
 * link) is hard to hit on a phone and gives the reader nothing extra: there
 * is only one thing to do with a topic, which is open it.
 */
export function DiscussionTopicCard({
  topic,
  onOpen,
}: {
  topic: DiscussionTopic;
  onOpen: (topic: DiscussionTopic) => void;
}) {
  const { t, i18n } = useTranslation();

  const posterName =
    topic.author?.display_name?.trim() || t("discussion.unknown_author");
  // `timeAgo` returns null for an unparseable timestamp rather than printing
  // "Invalid Date ago", so fall back to the raw date.
  const posted =
    timeAgo(topic.created_at, i18n.language) ??
    new Date(topic.created_at).toLocaleDateString();

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => onOpen(topic)}
      // Not a row of small targets: there is exactly one thing to do with a
      // topic, and a whole-card hit area is what works on a phone. The size
      // overrides undo the compact default, which is sized for a toolbar.
      className={cn(
        "h-auto w-full flex-col items-stretch justify-start gap-0 text-left",
        "rounded-2xl bg-m3-surface-container-lowest ghost-border",
        "p-4 sm:p-5 hover:bg-m3-surface-container",
      )}
      aria-label={t("discussion.open_topic", { title: topic.title })}
    >
      <div className="flex items-start gap-3">
        <Avatar size="sm" className={avatarColor(topic.author?.id ?? topic.id)}>
          {topic.author?.avatar_url && (
            <AvatarImage src={topic.author.avatar_url} alt={posterName} />
          )}
          <AvatarFallback>
            {avatarInitials(posterName, { uppercase: true })}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-m3-on-surface truncate">
            {topic.title}
          </p>
          <p className="mt-0.5 text-xs text-m3-on-surface-variant truncate">
            {posterName} · {posted}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/* Replies addressed to the reader. Rendered only when there are
              any: a grey "0" beside a red badge style reads as a broken
              badge, and an absent badge is the honest way to say "nothing
              here is waiting for you". */}
          {topic.mention_count > 0 && (
            <span
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5",
                "bg-m3-error text-[11px] font-bold text-white",
              )}
              aria-label={t("discussion.mentions_badge", {
                count: topic.mention_count,
              })}
            >
              {topic.mention_count}
            </span>
          )}
          <span
            className="inline-flex items-center gap-1 text-xs text-m3-on-surface-variant"
            aria-label={t("discussion.replies_count", {
              count: topic.comment_count,
            })}
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            {topic.comment_count}
          </span>
        </div>
      </div>

      {topic.status === "closed" && (
        <p className="mt-3 text-xs font-medium text-m3-on-surface-variant">
          {t("discussion.closed_badge")}
        </p>
      )}
    </Button>
  );
}
