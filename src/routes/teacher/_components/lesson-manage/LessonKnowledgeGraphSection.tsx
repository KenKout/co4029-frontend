import { useTranslation } from "react-i18next";
import { KnowledgeGraphPreview } from "../material-hub";
import { LessonEditorSection } from "./LessonEditorSection";

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
    <LessonEditorSection>
      <h2 className="font-headline font-bold text-2xl text-m3-primary">
        {t("teacher_lesson_manage.sections.knowledge_graph")}
      </h2>
      <KnowledgeGraphPreview lessonId={lessonId} readyCount={readyCount} />
    </LessonEditorSection>
  );
}
