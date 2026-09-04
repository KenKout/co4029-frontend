import { useTranslation } from "react-i18next";
import { LessonDiscussionPanel } from "@/routes/courses/_components/LessonDiscussionPanel";

/**
 * Discussion section — same section chrome as Material history / Knowledge
 * Graph, wrapping the shared lesson-discussion panel. New topic / edit /
 * close / delete show because the teacher holds ``can_manage``; composing
 * topics at the lesson they belong to beats detouring through the student
 * view.
 */
export function LessonDiscussionSection({ lessonId }: { lessonId: string }) {
  const { t } = useTranslation();
  return (
    <section className="space-y-5">
      <h2 className="font-headline font-bold text-2xl text-m3-primary">
        {t("teacher_lesson_manage.sections.discussion")}
      </h2>
      <LessonDiscussionPanel lessonId={lessonId} />
    </section>
  );
}
