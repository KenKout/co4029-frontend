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
        <div className="flex items-center gap-1 p-1.5 bg-m3-surface-container-low rounded-xl">
          <ToolbarBtn
            icon={Bold}
            label="Bold"
            onClick={() => applyMarkdown("**")}
          />
          <ToolbarBtn
            icon={Italic}
            label="Italic"
            onClick={() => applyMarkdown("*")}
          />
          <span className="w-px h-4 bg-m3-outline-variant/30 mx-0.5" />
          <ToolbarBtn
            icon={List}
            label="Bullet List"
            onClick={() => applyBlock("- ")}
          />
          <ToolbarBtn
            icon={LinkIcon}
            label="Insert Link"
            onClick={() => applyMarkdown("[", "](url)")}
          />
          <ToolbarBtn
            icon={Code}
            label="Inline Code"
            onClick={() => applyMarkdown("`")}
          />
          <ToolbarBtn
            icon={Image}
            label="Insert Image"
            onClick={() => applyMarkdown("![alt](", ")")}
          />
        </div>
      </div>
      <textarea
        ref={notesRef}
        className="min-h-[320px] w-full resize-y rounded-xl border border-m3-outline-variant/10 bg-m3-surface-container-lowest p-4 font-body text-base leading-relaxed text-m3-on-surface shadow-sm outline-none transition-all placeholder:text-m3-on-surface-variant/40 focus:ring-2 focus:ring-m3-secondary/20 sm:p-6"
        placeholder={
          "Write lesson notes in Markdown…\n\nYou can use **bold**, *italic*, lists, code blocks, and more."
        }
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
    </LessonEditorSection>
  );
}
