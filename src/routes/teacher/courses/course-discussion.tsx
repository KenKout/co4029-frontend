import { type FormEvent, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Loader2, MessagesSquare, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { DiscussionTopicCard } from "@/components/discussion/DiscussionTopicCard";
import { DiscussionThreadDialog } from "@/components/discussion/DiscussionThreadDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { CourseTabPanel } from "./_components/CourseTabPanel";
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
  const [composing, setComposing] = useState(false);

  const scope: DiscussionScope = { kind: "course", id: courseId };
  const topics = data?.topics ?? [];

  return (
    <CourseTabPanel>
      <SectionHeader
        title={t("discussion.title")}
        subtitle={t("discussion.course_subtitle")}
        action={
          data?.can_manage ? (
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={() => setComposing((current) => !current)}
              aria-expanded={composing}
            >
              <Plus className="h-4 w-4" />
              {t("discussion.actions.new_topic")}
            </Button>
          ) : null
        }
      />

      <Card className="gap-0 py-0 shadow-editorial">
        <CardContent className="p-6 sm:p-8">
          {data?.can_manage && composing && (
            <NewCourseTopicForm
              courseId={courseId}
              onDone={() => setComposing(false)}
            />
          )}

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
            <EmptyState
              icon={MessagesSquare}
              title={t("discussion.empty_title")}
              description={t("discussion.empty_teacher")}
              className="py-12"
            />
          )}

          <DiscussionThreadDialog
            topic={openTopic}
            scope={scope}
            open={openTopic !== null}
            onOpenChange={(next) => {
              if (!next) setOpenTopic(null);
            }}
          />
        </CardContent>
      </Card>
    </CourseTabPanel>
  );
}

function NewCourseTopicForm({
  courseId,
  onDone,
}: {
  courseId: string;
  onDone: () => void;
}) {
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
          onDone();
          toast.success(t("discussion.topic_posted"));
        },
      },
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-2 rounded-xl border border-m3-outline-variant/30 bg-m3-surface-container-low p-4"
    >
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
