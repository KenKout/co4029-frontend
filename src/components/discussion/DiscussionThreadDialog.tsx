import { type FormEvent, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { CornerDownRight, Send, X } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarColor,
  avatarInitials,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  type DiscussionScope,
  useCreateComment,
  useTopicComments,
} from "@/lib/api/hooks/discussions";
import { timeAgo } from "@/lib/format/time-ago";
import type { DiscussionComment, DiscussionTopic } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * The thread reader: topic on top, comments below, composer pinned to the
 * bottom — the shape people already know from a social comment sheet.
 *
 * One component for both boards. The course-level and lesson-level threads
 * differ only in which scope invalidates on write, so `scope` is a prop
 * rather than there being two dialogs to keep in step.
 *
 * Layout: a centred panel on desktop, a bottom sheet on mobile. Same markup,
 * different anchoring — a centred modal on a phone leaves the composer under
 * the keyboard, and a full-height sheet on a wide screen is a column of
 * whitespace. The comment list scrolls; the header and composer do not, so
 * the reply box never walks off the bottom of a long thread.
 */
export function DiscussionThreadDialog({
  topic,
  scope,
  open,
  onOpenChange,
}: {
  topic: DiscussionTopic | null;
  scope: DiscussionScope;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: comments, isLoading } = useTopicComments(
    open ? topic?.id : null,
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
            "transition-opacity duration-200",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            "fixed z-50 flex flex-col bg-m3-surface shadow-xl outline-none",
            // Mobile: bottom sheet, capped so the page behind stays visible.
            "inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl",
            // Desktop: centred panel.
            "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[min(80vh,44rem)]",
            "sm:w-[min(42rem,calc(100vw-3rem))] sm:max-h-none",
            "sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl",
            "transition-all duration-200",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
            "data-[starting-style]:translate-y-4 sm:data-[starting-style]:translate-y-[-46%]",
          )}
        >
          {topic && (
            <>
              <ThreadHeader topic={topic} />
              <CommentList
                comments={comments ?? []}
                isLoading={isLoading}
                topicId={topic.id}
                scope={scope}
                canComment={topic.status !== "closed" || topic.can_manage}
              />
            </>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ThreadHeader({ topic }: { topic: DiscussionTopic }) {
  const { t, i18n } = useTranslation();
  const posterName =
    topic.author?.display_name?.trim() || t("discussion.unknown_author");
  const posted =
    timeAgo(topic.created_at, i18n.language) ??
    new Date(topic.created_at).toLocaleDateString();

  return (
    <div className="shrink-0 border-b border-m3-outline-variant/40 px-5 py-4">
      {/* Grab handle: the affordance that says "this sheet drags/closes".
          Desktop gets the X instead. */}
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-m3-outline-variant sm:hidden" />
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <DialogPrimitive.Title className="font-headline text-lg font-bold text-m3-on-surface">
            {topic.title}
          </DialogPrimitive.Title>
          <p className="mt-0.5 text-xs text-m3-on-surface-variant">
            {posterName} · {posted}
          </p>
        </div>
        <DialogPrimitive.Close
          className="rounded-full p-1.5 text-m3-on-surface-variant hover:bg-m3-surface-container"
          aria-label={t("common.dismiss")}
        >
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      </div>
      {topic.body_markdown && (
        <p className="mt-3 whitespace-pre-wrap text-sm text-m3-on-surface">
          {topic.body_markdown}
        </p>
      )}
    </div>
  );
}

function CommentList({
  comments,
  isLoading,
  topicId,
  scope,
  canComment,
}: {
  comments: DiscussionComment[];
  isLoading: boolean;
  topicId: string;
  scope: DiscussionScope;
  canComment: boolean;
}) {
  const { t } = useTranslation();
  const [replyTo, setReplyTo] = useState<DiscussionComment | null>(null);

  // Threads are one level deep server-side (a reply to a reply is re-parented
  // onto the top-level comment), so grouping is a single pass rather than a
  // recursive render.
  const { roots, childrenOf } = useMemo(() => {
    const kids = new Map<string, DiscussionComment[]>();
    const tops: DiscussionComment[] = [];
    for (const c of comments) {
      if (c.parent_comment_id) {
        const list = kids.get(c.parent_comment_id) ?? [];
        list.push(c);
        kids.set(c.parent_comment_id, list);
      } else {
        tops.push(c);
      }
    }
    return { roots: tops, childrenOf: kids };
  }, [comments]);

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {isLoading ? (
          <p className="text-sm text-m3-on-surface-variant">
            {t("common.loading")}
          </p>
        ) : roots.length === 0 ? (
          <p className="py-8 text-center text-sm text-m3-on-surface-variant">
            {t("discussion.no_comments")}
          </p>
        ) : (
          <ul className="space-y-4">
            {roots.map((comment) => (
              <li key={comment.id}>
                <CommentRow comment={comment} onReply={setReplyTo} />
                {(childrenOf.get(comment.id) ?? []).length > 0 && (
                  <ul className="mt-3 space-y-3 border-l-2 border-m3-outline-variant/40 pl-4 sm:pl-6">
                    {(childrenOf.get(comment.id) ?? []).map((reply) => (
                      <li key={reply.id}>
                        <CommentRow comment={reply} onReply={setReplyTo} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canComment && (
        <Composer
          topicId={topicId}
          scope={scope}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
        />
      )}
    </>
  );
}

/**
 * A mention is written as `@Name` at the head of a reply. It is rendered, not
 * linked: with replies as the only way to mention someone, the relationship
 * is already carried by `parent_comment_id`, so the text is a label rather
 * than something to resolve.
 */
function CommentBody({ body }: { body: string }) {
  const parts = body.split(/^(@[^\n]+?)(?=\s)/);
  if (parts.length < 3) {
    return <span className="whitespace-pre-wrap">{body}</span>;
  }
  return (
    <span className="whitespace-pre-wrap">
      <span className="font-medium text-m3-primary underline">{parts[1]}</span>
      {parts.slice(2).join("")}
    </span>
  );
}

function CommentRow({
  comment,
  onReply,
}: {
  comment: DiscussionComment;
  onReply: (comment: DiscussionComment) => void;
}) {
  const { t, i18n } = useTranslation();
  const name =
    comment.author?.display_name?.trim() || t("discussion.unknown_author");
  const when =
    timeAgo(comment.created_at, i18n.language) ??
    new Date(comment.created_at).toLocaleDateString();

  return (
    <div className="flex items-start gap-2.5">
      <Avatar size="sm" className={avatarColor(comment.author_id)}>
        {comment.author?.avatar_url && (
          <AvatarImage src={comment.author.avatar_url} alt={name} />
        )}
        <AvatarFallback>
          {avatarInitials(name, { uppercase: true })}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-m3-surface-container px-3.5 py-2.5">
          <p className="text-xs font-semibold text-m3-on-surface">{name}</p>
          <p className="mt-0.5 text-sm text-m3-on-surface">
            <CommentBody body={comment.body} />
          </p>
        </div>
        <div className="mt-1 flex items-center gap-3 pl-1">
          <span className="text-[11px] text-m3-on-surface-variant">{when}</span>
          {/* Self-reply is allowed: adding a thought to your own comment is
              normal, and it simply does not badge you. */}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => onReply(comment)}
            className="h-auto px-0 text-[11px] font-semibold text-m3-on-surface-variant hover:bg-transparent hover:text-m3-primary"
          >
            {t("discussion.reply")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Composer({
  topicId,
  scope,
  replyTo,
  onClearReply,
}: {
  topicId: string;
  scope: DiscussionScope;
  replyTo: DiscussionComment | null;
  onClearReply: () => void;
}) {
  const { t } = useTranslation();
  const [body, setBody] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const create = useCreateComment(topicId, scope);

  const replyName =
    replyTo?.author?.display_name?.trim() || t("discussion.unknown_author");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || create.isPending) return;
    // The handle is prepended at SEND time, not typed into the box: it keeps
    // the composer's text as what the author actually wrote, so backspacing
    // through the mention cannot silently detach a reply from its parent.
    const text = replyTo ? `@${replyName} ${trimmed}` : trimmed;
    create.mutate(
      { body: text, parent_comment_id: replyTo?.id ?? null },
      {
        onSuccess: () => {
          setBody("");
          onClearReply();
        },
      },
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="shrink-0 border-t border-m3-outline-variant/40 px-5 py-3"
    >
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 text-xs text-m3-on-surface-variant">
          <CornerDownRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">
            {t("discussion.replying_to", { name: replyName })}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onClearReply}
            className="h-auto px-0 text-xs font-semibold hover:bg-transparent hover:text-m3-primary"
          >
            {t("common.cancel")}
          </Button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={1}
          placeholder={
            replyTo
              ? t("discussion.reply_placeholder", { name: replyName })
              : t("discussion.comment_placeholder")
          }
          className={cn(
            "min-h-10 max-h-32 flex-1 resize-y rounded-2xl bg-m3-surface-container",
            "px-4 py-2.5 text-sm text-m3-on-surface outline-none",
            "focus-visible:ring-2 focus-visible:ring-m3-primary/50",
          )}
        />
        <Button
          type="submit"
          disabled={!body.trim() || create.isPending}
          className="h-10 w-10 shrink-0 rounded-full p-0"
          aria-label={t("discussion.send")}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
