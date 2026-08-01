import { useTranslation } from "react-i18next";
import { KnowledgeGraphPreview } from "../material-hub";

/** Knowledge Graph section (brought over from the AI hub). */
export function LessonKnowledgeGraphSection({
  lessonId,
  readyCount,
}: {
  lessonId: string;
  readyCount: number;
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-5">
      <h2 className="font-headline font-bold text-2xl text-m3-primary">
        {t("teacher_lesson_manage.sections.knowledge_graph")}
      </h2>
      <KnowledgeGraphPreview lessonId={lessonId} readyCount={readyCount} />
    </section>
  );
}
