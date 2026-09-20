import { useTranslation } from "react-i18next";
import {
  Bold,
  Italic,
  List,
  Hash,
  Link as LinkIcon,
  Image,
  Code,
} from "lucide-react";
import {
  ToolbarBtn,
  makeMarkdownApplier,
} from "@/components/ui/markdown-toolbar";
import { LessonEditorSection } from "./LessonEditorSection";
import { MarkdownEditorSurface } from "./MarkdownEditorSurface";

/**
 * Reading-type lesson content: a markdown editor with a formatting toolbar and
 * a live word-count / read-time estimate in the header.
 */
export function ReadingContent({
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
  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  return (
    <LessonEditorSection>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-headline font-bold text-2xl text-m3-primary">
            {t("teacher_lesson_manage.sections.reading_content")}
          </h2>
          <p className="text-sm text-m3-on-surface-variant mt-0.5">
            {wordCount > 0
              ? t("teacher_lesson_manage.sections.read_stats", {
                  words: wordCount,
                  minutes: readTime,
                })
              : t("teacher_lesson_manage.sections.reading_content_hint")}
          </p>
        </div>
      </div>
      <MarkdownEditorSurface
        value={notes}
        onChange={setNotes}
        editorRef={notesRef}
        placeholder={t("teacher_lesson_manage.editor.reading_placeholder")}
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
            <ToolbarBtn
              icon={List}
              label={t("teacher_lesson_manage.editor.bullet_list")}
              onClick={() => applyBlock("- ")}
            />
            <ToolbarBtn
              icon={Hash}
              label={t("teacher_lesson_manage.editor.heading")}
              onClick={() => applyBlock("# ")}
            />
            <span className="w-px h-4 bg-m3-outline-variant/30 mx-0.5" />
            <ToolbarBtn
              icon={LinkIcon}
              label={t("teacher_lesson_manage.editor.insert_link")}
              onClick={() => applyMarkdown("[", "](url)")}
            />
            <ToolbarBtn
              icon={Image}
              label={t("teacher_lesson_manage.editor.insert_image")}
              onClick={() => applyMarkdown("![alt](", ")")}
            />
            <ToolbarBtn
              icon={Code}
              label={t("teacher_lesson_manage.editor.code_block")}
              onClick={() => applyMarkdown("```\n", "\n```")}
            />
          </>
        }
      />
    </LessonEditorSection>
  );
}
