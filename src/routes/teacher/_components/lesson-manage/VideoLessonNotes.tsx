import {
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  Code,
  Image,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ToolbarBtn,
  makeMarkdownApplier,
} from "@/components/ui/markdown-toolbar";
import { LessonEditorSection } from "./LessonEditorSection";
import { MarkdownEditorSurface } from "./MarkdownEditorSurface";

/**
 * Markdown lesson-notes editor for video-type lessons: a formatting toolbar
 * plus the controlled textarea.
 */
export function VideoLessonNotes({
  notes,
  setNotes,
  notesRef,
}: {
  notes: string;
  setNotes: (v: string) => void;
  notesRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const { t } = useTranslation();
  const { applyMarkdown, applyBlock } = makeMarkdownApplier(
    () => notesRef.current,
    () => notes,
    setNotes,
  );

  return (
    <LessonEditorSection>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-headline text-2xl font-bold text-m3-primary">
            {t("teacher_lesson_manage.sections.lesson_notes")}
          </h2>
          <p className="mt-0.5 text-sm text-m3-on-surface-variant">
            {t("teacher_lesson_manage.sections.lesson_notes_hint")}
          </p>
        </div>
      </div>
      <MarkdownEditorSurface
        value={notes}
        onChange={setNotes}
        editorRef={notesRef}
        minHeight="min-h-[320px]"
        placeholder={t("teacher_lesson_manage.editor.notes_placeholder")}
        toolbar={
          <>
            <ToolbarBtn
              icon={Bold}
              label={t("teacher_lesson_manage.editor.bold")}
              onClick={() => applyMarkdown("**")}
            />
            <ToolbarBtn
              icon={Italic}
              label={t("teacher_lesson_manage.editor.italic")}
              onClick={() => applyMarkdown("*")}
            />
            <span className="w-px h-4 bg-m3-outline-variant/30 mx-0.5" />
            <ToolbarBtn
              icon={List}
              label={t("teacher_lesson_manage.editor.bullet_list")}
              onClick={() => applyBlock("- ")}
            />
            <ToolbarBtn
              icon={LinkIcon}
              label={t("teacher_lesson_manage.editor.insert_link")}
              onClick={() => applyMarkdown("[", "](url)")}
            />
            <ToolbarBtn
              icon={Code}
              label={t("teacher_lesson_manage.editor.inline_code")}
              onClick={() => applyMarkdown("`")}
            />
            <ToolbarBtn
              icon={Image}
              label={t("teacher_lesson_manage.editor.insert_image")}
              onClick={() => applyMarkdown("![alt](", ")")}
            />
          </>
        }
      />
    </LessonEditorSection>
  );
}
