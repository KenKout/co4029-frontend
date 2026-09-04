import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Lock,
  MessageSquare,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarInitials,
} from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/ui/use-confirm";
import { timeAgo } from "@/lib/format/time-ago";
import {
  useCreateComment,
  useCreateDiscussionTopic,
  useDeleteComment,
  useDeleteDiscussionTopic,
  useLessonDiscussionTopics,
  useTopicComments,
  useUpdateComment,
  useUpdateDiscussionTopic,
} from "@/lib/api/hooks/discussions";
import type {
  DiscussionComment,
  DiscussionCommentAuthor,
  DiscussionTopic,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

// ── Shared author byline ───────────────────────────────────────────────────

/**
 * Avatar + name + relative time, used by both a comment row and a topic
 * header so the two never drift apart.
 *
 * The avatar renders <AvatarImage> when the API resolved a presigned
 * `avatar_url`; base-ui falls back to <AvatarFallback> initials on a missing
 * url OR a failed image load (an expired presign), so a broken URL degrades to
 * initials instead of a broken-image icon.
 */
function AuthorByline({
  author,
  fallbackName,
  timestamp,
  size = "sm",
  edited,
  children,
}: {
  author: DiscussionCommentAuthor | null | undefined;
  fallbackName: string;
  timestamp: string;
  size?: "sm" | "default";
  edited?: boolean;
  children?: React.ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const name = author?.display_name ?? fallbackName;
  const relative = timeAgo(timestamp, i18n.language, {
    justNow: t("discussion.just_now"),
  });

  return (
    <div className="flex items-center gap-2">
      <Avatar size={size} className={cn("shrink-0", size === "sm" && "size-8")}>
        {author?.avatar_url ? (
          <AvatarImage src={author.avatar_url} alt={name} />
        ) : null}
        <AvatarFallback className="text-xs">
          {avatarInitials(name, { uppercase: true, fallback: "?" })}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm font-semibold text-m3-on-surface">{name}</span>
      <span
        className="text-xs text-m3-on-surface-variant"
        title={new Date(timestamp).toLocaleString()}
      >
        {relative ?? new Date(timestamp).toLocaleString()}
      </span>
      {edited && (
        <span className="text-xs italic text-m3-on-surface-variant">
          {t("discussion.edited")}
        </span>
      )}
      {children}
    </div>
  );
}

// ── Comment row ────────────────────────────────────────────────────────────

function CommentRow({
  comment,
  topicId,
  lessonId,
}: {
  comment: DiscussionComment;
  topicId: string;
  lessonId: string;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const del = useDeleteComment(topicId, lessonId);
  const update = useUpdateComment(topicId);
  const { confirm, dialog } = useConfirm();

  // Deleting a comment is irreversible for the author (soft-delete server-side,
  // but there is no undo affordance), and the trash icon sits one icon away
  // from Edit — so it goes through a real confirmation instead of firing on a
  // single mis-click.
  async function handleDelete() {
    const ok = await confirm({
      title: t("discussion.confirm.delete_comment_title"),
      description: t("discussion.confirm.delete_comment_body"),
      confirmLabel: t("discussion.actions.delete_comment"),
      cancelLabel: t("discussion.actions.cancel"),
      confirmVariant: "destructive",
    });
    if (!ok) return;
    del.mutate(comment.id, {
      onError: () => toast.error(t("discussion.errors.delete_comment")),
    });
  }

  function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    update.mutate(
      { commentId: comment.id, body: trimmed },
      {
        onSuccess: () => setEditing(false),
        onError: () => toast.error(t("discussion.errors.update_comment")),
      },
    );
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          maxLength={5000}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft(comment.body);
              setEditing(false);
            }}
          >
            {t("discussion.actions.cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={update.isPending || !draft.trim()}
            onClick={handleSave}
          >
            {update.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {t("common.save")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <AuthorByline
        author={comment.author}
        fallbackName={t("discussion.unknown_author")}
        timestamp={comment.created_at}
        edited={isEdited(comment.created_at, comment.updated_at)}
      >
        {/* Edit + Delete share one tight icon group pinned right. They used to
            be two separately-spaced Buttons, which left a visible gap between
            them because each carried the default Button padding. */}
        {(comment.is_own || comment.can_delete) && (
          <div className="ml-auto flex items-center gap-0.5">
            {comment.is_own && (
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => setEditing(true)}
                disabled={update.isPending}
                aria-label={t("discussion.actions.edit_comment")}
                className="size-7 text-m3-on-surface-variant transition-colors hover:text-m3-primary disabled:opacity-50"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {comment.can_delete && (
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => void handleDelete()}
                disabled={del.isPending}
                aria-label={t("discussion.actions.delete_comment")}
                className="size-7 text-m3-on-surface-variant transition-colors hover:text-danger disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </AuthorByline>
      <p className="mt-1 whitespace-pre-wrap break-words pl-10 text-sm text-m3-on-surface-variant">
        {comment.body}
      </p>
      {dialog}
    </div>
  );
}

/**
 * True when a row was modified after it was created.
 *
 * One second of slack: `created_at` and `updated_at` are stamped by separate
 * expressions in the same INSERT, so they can differ by microseconds on a row
 * that was never edited — comparing raw inequality tagged EVERY comment as
 * edited.
 */
function isEdited(createdAt: string, updatedAt: string): boolean {
  const created = new Date(createdAt).getTime();
  const updated = new Date(updatedAt).getTime();
  if (!Number.isFinite(created) || !Number.isFinite(updated)) return false;
  return updated - created > 1000;
}

// ── Comment composer ─────────────────────────────────────────────────────

function CommentComposer({
  topicId,
  lessonId,
  disabled,
}: {
  topicId: string;
  lessonId: string;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const [body, setBody] = useState("");
  const create = useCreateComment(topicId, lessonId);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    create.mutate(
      { body: trimmed },
      {
        onSuccess: () => setBody(""),
        onError: () => toast.error(t("discussion.errors.post_comment")),
      },
    );
  }

  if (disabled) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-m3-surface-container-low px-3 py-2 text-xs text-m3-on-surface-variant">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        {t("discussion.closed_no_comments")}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        maxLength={5000}
        placeholder={t("discussion.comment_placeholder")}
        resize="y"
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={create.isPending || !body.trim()}
          className="gap-1.5"
        >
          {create.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {t("discussion.actions.post_comment")}
        </Button>
      </div>
    </form>
  );
}

// ── Topic card (expandable to comments) ──────────────────────────────────

/** Topic body editor (teacher only) — the title edits inline on the card. */
function TopicEditForm({
  topic,
  lessonId,
  onSaved,
  onCancel,
}: {
  topic: DiscussionTopic;
  lessonId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [bodyDraft, setBodyDraft] = useState(topic.body_markdown ?? "");
  const updateTopic = useUpdateDiscussionTopic(lessonId);

  function saveEdit() {
    updateTopic.mutate(
      {
        topicId: topic.id,
        title: topic.title,
        body_markdown: bodyDraft.trim() || null,
      },
      {
        onSuccess: onSaved,
        onError: () => toast.error(t("discussion.errors.update_topic")),
      },
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-m3-primary/20 bg-m3-primary-fixed/20 p-4">
      <h5 className="font-headline text-sm font-bold text-m3-on-surface">
        {t("discussion.actions.edit_topic")}
      </h5>
      <Textarea
        value={bodyDraft}
        onChange={(e) => setBodyDraft(e.target.value)}
        rows={3}
        maxLength={20000}
        placeholder={t("discussion.topic_body_placeholder")}
        resize="y"
        className="bg-white"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t("discussion.actions.cancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={updateTopic.isPending}
          onClick={saveEdit}
        >
          {updateTopic.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Pencil className="h-3.5 w-3.5" />
          )}
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}

function TopicCard({
  topic,
  lessonId,
}: {
  topic: DiscussionTopic;
  lessonId: string;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <TopicEditForm
        topic={topic}
        lessonId={lessonId}
        onSaved={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="rounded-xl border border-m3-outline-variant/40 bg-m3-surface-container-lowest">
      <TopicHeader topic={topic} open={open} onToggle={() => setOpen((v) => !v)} />
      {open && (
        <TopicBody
          topic={topic}
          lessonId={lessonId}
          onEdit={() => setEditing(true)}
        />
      )}
    </div>
  );
}

/** Collapsed row: chevron, inline-editable title, closed badge, reply count. */
function TopicHeader({
  topic,
  open,
  onToggle,
}: {
  topic: DiscussionTopic;
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const updateTopic = useUpdateDiscussionTopic(topic.lesson_id ?? "");
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(topic.title);
  const isClosed = topic.status === "closed";

  function commitTitle() {
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === topic.title) {
      setTitleDraft(topic.title);
      setTitleEditing(false);
      return;
    }
    updateTopic.mutate(
      { topicId: topic.id, title: trimmed },
      {
        onSuccess: () => setTitleEditing(false),
        onError: () => {
          setTitleDraft(topic.title);
          setTitleEditing(false);
          toast.error(t("discussion.errors.update_topic"));
        },
      },
    );
  }

  function startEditing() {
    setTitleDraft(topic.title);
    setTitleEditing(true);
  }

  return (
    <Button variant="ghost"
      type="button"
      onClick={() => { if (!titleEditing) onToggle(); }}
      className="flex w-full items-start gap-3 p-4 text-left h-auto whitespace-normal"
    >
      <div className="mt-0.5 shrink-0 text-m3-primary">
        {open ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {titleEditing ? (
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  commitTitle();
                } else if (e.key === "Escape") {
                  setTitleDraft(topic.title);
                  setTitleEditing(false);
                }
              }}
              maxLength={255}
              autoFocus
              aria-label={topic.title}
              onClick={(e) => e.stopPropagation()}
              className="min-w-0 flex-1 rounded-lg border border-input bg-white px-2 py-1 text-sm font-headline font-bold text-m3-on-surface outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          ) : (
            <h5
              role={topic.can_manage ? "button" : undefined}
              tabIndex={topic.can_manage ? 0 : undefined}
              onClick={(e) => {
                if (!topic.can_manage) return;
                e.stopPropagation();
                startEditing();
              }}
              onKeyDown={(e) => {
                if (!topic.can_manage) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  startEditing();
                }
              }}
              title={topic.can_manage ? t("discussion.actions.edit_topic") : undefined}
              className={cn(
                "font-headline text-sm font-bold text-m3-on-surface",
                topic.can_manage &&
                  "cursor-text rounded px-1 -mx-1 hover:bg-m3-surface-container-high",
              )}
            >
              {topic.title}
            </h5>
          )}
          {isClosed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-m3-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant">
              <Lock className="h-3 w-3" />
              {t("discussion.status.closed")}
            </span>
          )}
        </div>
        {/* Attribution row: who opened the topic, with avatar + relative time,
            then the reply count. Previously the card showed neither author nor
            date, so a student could not tell who had asked. */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-m3-on-surface-variant">
          <AuthorByline
            author={topic.author}
            fallbackName={t("discussion.unknown_author")}
            timestamp={topic.created_at}
            edited={isEdited(topic.created_at, topic.updated_at)}
          />
          <span className="inline-flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            {t("discussion.comment_count", { count: topic.comment_count })}
          </span>
        </div>
      </div>
    </Button>
  );
}

/** Expanded topic: body markdown, manage controls, comments, composer. */
function TopicBody({
  topic,
  lessonId,
  onEdit,
}: {
  topic: DiscussionTopic;
  lessonId: string;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const comments = useTopicComments(topic.id);
  const updateTopic = useUpdateDiscussionTopic(lessonId);
  const deleteTopic = useDeleteDiscussionTopic(lessonId);
  const { confirm, dialog } = useConfirm();
  const isClosed = topic.status === "closed";

  function toggleStatus() {
    updateTopic.mutate(
      { topicId: topic.id, status: isClosed ? "open" : "closed" },
      { onError: () => toast.error(t("discussion.errors.update_topic")) },
    );
  }

  // Deleting a topic cascades to every comment on it, so it is confirmed for
  // the same reason a comment delete is — only with higher stakes.
  async function handleDelete() {
    const ok = await confirm({
      title: t("discussion.confirm.delete_topic_title"),
      description: t("discussion.confirm.delete_topic_body"),
      confirmLabel: t("discussion.actions.delete_topic"),
      cancelLabel: t("discussion.actions.cancel"),
      confirmVariant: "destructive",
    });
    if (!ok) return;
    deleteTopic.mutate(topic.id, {
      onError: () => toast.error(t("discussion.errors.delete_topic")),
    });
  }

  return (
    <div className="space-y-4 border-t border-m3-outline-variant/40 p-4">
      {topic.body_markdown && (
        <div className="prose prose-sm max-w-none text-m3-on-surface-variant">
          <ReactMarkdown>{topic.body_markdown}</ReactMarkdown>
        </div>
      )}

      {/* Teacher controls */}
      {topic.can_manage && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEdit}
            disabled={updateTopic.isPending}
            className="gap-1.5 text-xs"
          >
            <Pencil className="h-3.5 w-3.5" />
            {t("discussion.actions.edit_topic")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleStatus}
            disabled={updateTopic.isPending}
            className="gap-1.5 text-xs"
          >
            {isClosed
              ? t("discussion.actions.reopen")
              : t("discussion.actions.close")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleDelete()}
            disabled={deleteTopic.isPending}
            className="gap-1.5 border-danger/30 text-danger text-xs hover:bg-danger/5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("discussion.actions.delete_topic")}
          </Button>
        </div>
      )}

      {/* Comments */}
      {comments.isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-m3-on-surface-variant" />
        </div>
      ) : comments.data && comments.data.length > 0 ? (
        <div className="space-y-4">
          {comments.data.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              topicId={topic.id}
              lessonId={lessonId}
            />
          ))}
        </div>
      ) : (
        <p className="py-2 text-center text-xs text-m3-on-surface-variant">
          {t("discussion.no_comments")}
        </p>
      )}

      <CommentComposer
        topicId={topic.id}
        lessonId={lessonId}
        disabled={isClosed && !topic.can_manage}
      />
      {dialog}
    </div>
  );
}

// ── New-topic composer (teacher only) ────────────────────────────────────

function NewTopicComposer({ lessonId }: { lessonId: string }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const create = useCreateDiscussionTopic(lessonId);

  // Enter commits the topic; Shift+Enter makes a newline inside the optional
  // detail field. Empty title disables the commit.
  function commit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    create.mutate(
      { title: trimmedTitle, body_markdown: body.trim() || null },
      {
        onSuccess: () => {
          setTitle("");
          setBody("");
        },
        onError: () => toast.error(t("discussion.errors.post_topic")),
      },
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        commit();
      }}
      className="flex-1 min-w-[240px]"
    >
      {/* Inline composer: a borderless input that reads as a text line in the
          header row, not a nested form card. Enter posts. */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            commit();
          }
        }}
        maxLength={255}
        placeholder={t("discussion.topic_title_placeholder")}
        aria-label={t("discussion.topic_title_placeholder")}
        className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
      />
      {title.trim() ? (
        /* No autoFocus: it mounted on the FIRST keystroke of the title and
           stole focus mid-word, so character two landed in the detail field.
           Reveal-only — the caret stays in the title line the user is typing
           in; Tab reaches the detail field normally. */
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          maxLength={20000}
          placeholder={t("discussion.topic_body_placeholder")}
          resize="y"
          className="mt-2 bg-white"
        />
      ) : null}
      {title.trim() ? (
        <div className="mt-2 flex items-center justify-end gap-2">
          <span className="mr-auto text-[11px] text-m3-on-surface-variant">
            {t("discussion.inline_hint")}
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={create.isPending || !title.trim()}
            className="gap-1.5"
          >
            {create.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Pencil className="h-3.5 w-3.5" />
            )}
            {t("discussion.actions.post_topic")}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

// ── Panel ────────────────────────────────────────────────────────────────

export function LessonDiscussionPanel({ lessonId }: { lessonId: string }) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useLessonDiscussionTopics(lessonId);

  return (
    <GlassCard className="p-6 sm:p-8">
      {data?.can_manage && (
        <div className="mb-5 flex items-start justify-end gap-3 min-w-0">
          <NewTopicComposer lessonId={lessonId} />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-m3-on-surface-variant" />
        </div>
      ) : isError ? (
        <p className="py-10 text-center text-sm text-m3-on-surface-variant">
          {t("discussion.load_failed")}
        </p>
      ) : data && data.topics.length > 0 ? (
        <div className="space-y-3">
          {data.topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} lessonId={lessonId} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <p className="text-sm font-semibold text-m3-on-surface">
            {t("discussion.empty_title")}
          </p>
          <p className="text-xs text-m3-on-surface-variant">
            {data?.can_manage
              ? t("discussion.empty_teacher")
              : t("discussion.empty_student")}
          </p>
        </div>
      )}
    </GlassCard>
  );
}
