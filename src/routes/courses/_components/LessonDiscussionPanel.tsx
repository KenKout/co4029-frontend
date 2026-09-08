import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { DiscussionTopicCard } from "@/components/discussion/DiscussionTopicCard";
import { DiscussionThreadDialog } from "@/components/discussion/DiscussionThreadDialog";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  type DiscussionScope,
  useCreateDiscussionTopic,
  useLessonDiscussionTopics,
} from "@/lib/api/hooks/discussions";
import type { DiscussionTopic } from "@/lib/api/types";

/**
 * Avatar + name + relative time, used by both a comment row and a topic
 * header so the two never drift apart.
 *
 * The avatar renders <AvatarImage> when the API resolved a presigned
 * `avatar_url`; base-ui falls back to <AvatarFallback> initials on a missing
 * url OR a failed image load (an expired presign), so a broken URL degrades to
 * initials instead of a broken-image icon.
 */
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
  // Reading a thread is a dialog, not an inline expand: the same shape the
  // course board uses, so a student meets one discussion UI on both pages.
  const [openTopic, setOpenTopic] = useState<DiscussionTopic | null>(null);
  const scope: DiscussionScope = { kind: "lesson", id: lessonId };

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
            <DiscussionTopicCard
              key={topic.id}
              topic={topic}
              onOpen={setOpenTopic}
            />
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
      <DiscussionThreadDialog
        topic={openTopic}
        scope={scope}
        open={openTopic !== null}
        onOpenChange={(next) => {
          if (!next) setOpenTopic(null);
        }}
      />
    </GlassCard>
  );
}
