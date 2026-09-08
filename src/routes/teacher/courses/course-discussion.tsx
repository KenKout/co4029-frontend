import { type FormEvent, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Loader2, MessagesSquare, Pencil } from "lucide-react";
import { toast } from "sonner";

import { DiscussionTopicCard } from "@/components/discussion/DiscussionTopicCard";
import { DiscussionThreadDialog } from "@/components/discussion/DiscussionThreadDialog";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type DiscussionScope,
  useCourseDiscussionTopics,
  useCreateCourseDiscussionTopic,
} from "@/lib/api/hooks/discussions";
import type { DiscussionTopic } from "@/lib/api/types";

/**
 * Course-wide discussion board, teacher side.
 *
 * The same card + thread dialog the students see on the course page — one
 * discussion UI, so a teacher reading a thread sees it laid out the way the
 * student who wrote it did. What is teacher-only is the composer above the
 * list; every per-topic control (edit, close, delete) lives inside the dialog,
 * gated on the server's `can_manage`.
 */
export default function CourseDiscussionPage() {
  const { t } = useTranslation();
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  const { data, isLoading, isError } = useCourseDiscussionTopics(courseId);
  const [openTopic, setOpenTopic] = useState<DiscussionTopic | null>(null);

  const scope: DiscussionScope = { kind: "course", id: courseId };
  const topics = data?.topics ?? [];

  return (
    <GlassCard className="p-6 sm:p-8">
      {data?.can_manage && <NewCourseTopicForm courseId={courseId} />}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-m3-on-surface-variant" />
        </div>
      ) : isError ? (
        <p className="py-10 text-center text-sm text-m3-on-surface-variant">
          {t("discussion.load_failed")}
        </p>
      ) : topics.length > 0 ? (
        <div className="space-y-3">
          {topics.map((topic) => (
            <DiscussionTopicCard
              key={topic.id}
              topic={topic}
              onOpen={setOpenTopic}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <MessagesSquare
            className="h-8 w-8 text-m3-on-surface-variant"
            aria-hidden="true"
          />
          <p className="text-sm font-semibold text-m3-on-surface">
            {t("discussion.empty_title")}
          </p>
          <p className="text-sm text-m3-on-surface-variant">
            {t("discussion.empty_teacher")}
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

function NewCourseTopicForm({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const create = useCreateCourseDiscussionTopic(courseId);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || create.isPending) return;
    create.mutate(
      { title: trimmed, body_markdown: body.trim() || null },
      {
        onSuccess: () => {
          setTitle("");
          setBody("");
          toast.success(t("discussion.topic_posted"));
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("discussion.topic_title_placeholder")}
        className="normal-case"
      />
      {/* The body only appears once there is a title: an empty two-field form
          reads as a chore, and the detail is genuinely optional. */}
      {title.trim() && (
        <>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder={t("discussion.topic_body_placeholder")}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={create.isPending}
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
        </>
      )}
    </form>
  );
}
