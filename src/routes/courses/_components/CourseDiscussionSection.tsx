import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MessagesSquare } from "lucide-react";

import { DiscussionTopicCard } from "@/components/discussion/DiscussionTopicCard";
import { DiscussionThreadDialog } from "@/components/discussion/DiscussionThreadDialog";
import { useCourseDiscussionTopics } from "@/lib/api/hooks/discussions";
import type { DiscussionTopic } from "@/lib/api/types";

/**
 * Course-wide discussion board on the student course page, below the
 * curriculum.
 *
 * Enrolled-only by construction rather than by a second check here: the
 * caller renders it under the same `enrolled` gate as the curriculum, and the
 * server 404s a non-participant. On that 404 the section renders nothing at
 * all — an empty board would tell a visitor there is a conversation they are
 * not in, which is exactly what the gate exists to avoid.
 */
export function CourseDiscussionSection({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useCourseDiscussionTopics(courseId);
  const [openTopic, setOpenTopic] = useState<DiscussionTopic | null>(null);

  if (isError) return null;

  const topics = data?.topics ?? [];
  // Nothing to say yet and nothing the student can do about it — a teacher
  // opens topics. An empty card would be furniture.
  if (!isLoading && topics.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 font-headline text-xl font-bold text-m3-on-surface">
        <MessagesSquare
          className="h-5 w-5 text-m3-primary"
          aria-hidden="true"
        />
        {t("discussion.course_section_title")}
      </h2>

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-m3-surface-container" />
      ) : (
        <ul className="space-y-3">
          {topics.map((topic) => (
            <li key={topic.id}>
              <DiscussionTopicCard topic={topic} onOpen={setOpenTopic} />
            </li>
          ))}
        </ul>
      )}

      <DiscussionThreadDialog
        topic={openTopic}
        scope={{ kind: "course", id: courseId }}
        open={openTopic !== null}
        onOpenChange={(next) => {
          if (!next) setOpenTopic(null);
        }}
      />
    </section>
  );
}
