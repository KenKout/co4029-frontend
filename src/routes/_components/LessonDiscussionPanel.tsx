import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Loader2,
  Lock,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  useCreateComment,
  useCreateDiscussionTopic,
  useDeleteComment,
  useDeleteDiscussionTopic,
  useLessonDiscussionTopics,
  useTopicComments,
  useUpdateDiscussionTopic,
} from "@/lib/api/hooks/discussions";
import type { DiscussionComment, DiscussionTopic } from "@/lib/api/types";

function initialsOf(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "").concat(parts[1]?.[0] ?? "").toUpperCase() || "?";
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
  const del = useDeleteComment(topicId, lessonId);
  const name = comment.author?.display_name ?? t("discussion.unknown_author");

  function handleDelete() {
    del.mutate(comment.id, {
      onError: () => toast.error(t("discussion.errors.delete_comment")),
    });
  }

  return (
    <div className="flex gap-3">
      <Avatar size="sm" className="size-8 shrink-0">
        <AvatarFallback className="text-xs">{initialsOf(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-m3-on-surface">
            {name}
          </span>
          <span className="text-xs text-m3-on-surface-variant">
            {new Date(comment.created_at).toLocaleString()}
          </span>
          {comment.can_delete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={del.isPending}
              aria-label={t("discussion.actions.delete_comment")}
              className="ml-auto text-m3-on-surface-variant transition-colors hover:text-danger disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-m3-on-surface-variant">
          {comment.body}
        </p>
      </div>
    </div>
  );
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
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        maxLength={5000}
        placeholder={t("discussion.comment_placeholder")}
        className="w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
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

function TopicCard({
  topic,
  lessonId,
}: {
  topic: DiscussionTopic;
  lessonId: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const comments = useTopicComments(open ? topic.id : undefined);
  const updateTopic = useUpdateDiscussionTopic(lessonId);
  const deleteTopic = useDeleteDiscussionTopic(lessonId);
  const isClosed = topic.status === "closed";

  function toggleStatus() {
    updateTopic.mutate(
      { topicId: topic.id, status: isClosed ? "open" : "closed" },
      { onError: () => toast.error(t("discussion.errors.update_topic")) },
    );
  }

  function handleDelete() {
    deleteTopic.mutate(topic.id, {
      onError: () => toast.error(t("discussion.errors.delete_topic")),
    });
  }

  return (
    <div className="rounded-xl border border-m3-outline-variant/40 bg-m3-surface-container-lowest">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 p-4 text-left"
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
            <h5 className="font-headline text-sm font-bold text-m3-on-surface">
              {topic.title}
            </h5>
            {isClosed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-m3-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant">
                <Lock className="h-3 w-3" />
                {t("discussion.status.closed")}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-m3-on-surface-variant">
            <MessageSquare className="h-3.5 w-3.5" />
            {t("discussion.comment_count", { count: topic.comment_count })}
          </div>
        </div>
      </button>

      {open && (
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
                onClick={handleDelete}
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
        </div>
      )}
    </div>
  );
}

// ── New-topic composer (teacher only) ────────────────────────────────────

function NewTopicComposer({ lessonId }: { lessonId: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const create = useCreateDiscussionTopic(lessonId);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    create.mutate(
      { title: trimmedTitle, body_markdown: body.trim() || null },
      {
        onSuccess: () => {
          setTitle("");
          setBody("");
          setOpen(false);
          toast.success(t("discussion.topic_posted"));
        },
        onError: () => toast.error(t("discussion.errors.post_topic")),
      },
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Plus className="h-4 w-4" />
        {t("discussion.actions.new_topic")}
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-m3-primary/20 bg-m3-primary-fixed/20 p-4"
    >
      <div className="flex items-center justify-between">
        <h5 className="font-headline text-sm font-bold text-m3-on-surface">
          {t("discussion.new_topic_title")}
        </h5>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t("discussion.actions.cancel")}
          className="text-m3-on-surface-variant hover:text-m3-on-surface"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={255}
        placeholder={t("discussion.topic_title_placeholder")}
        className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={20000}
        placeholder={t("discussion.topic_body_placeholder")}
        className="w-full resize-y rounded-lg border border-input bg-white px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          {t("discussion.actions.cancel")}
        </Button>
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
    </form>
  );
}

// ── Panel ────────────────────────────────────────────────────────────────

export function LessonDiscussionPanel({ lessonId }: { lessonId: string }) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useLessonDiscussionTopics(lessonId);

  return (
    <GlassCard className="p-6 sm:p-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-m3-secondary" />
          <h4 className="font-headline text-sm font-bold text-m3-on-surface">
            {t("discussion.title")}
          </h4>
        </div>
        {data?.can_manage && <NewTopicComposer lessonId={lessonId} />}
      </div>

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
