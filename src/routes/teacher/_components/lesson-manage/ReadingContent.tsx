import { useTranslation } from "react-i18next";
import {
  Bold,
  Italic,
  List,
  Hash,
  Link as LinkIcon,
  Image,
  Code,
  AlignLeft,
} from "lucide-react";
import { ToolbarBtn, makeMarkdownApplier } from "@/components/ui/markdown-toolbar";

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
    <section className="space-y-4">
      <div className="flex items-center justify-between">
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
          <ToolbarBtn
            icon={List}
            label="Bullet List"
            onClick={() => applyBlock("- ")}
          />
          <ToolbarBtn
            icon={Hash}
            label="Heading"
            onClick={() => applyBlock("# ")}
          />
          <span className="w-px h-4 bg-m3-outline-variant/30 mx-0.5" />
          <ToolbarBtn
            icon={LinkIcon}
            label="Insert Link"
            onClick={() => applyMarkdown("[", "](url)")}
          />
          <ToolbarBtn
            icon={Image}
            label="Insert Image"
            onClick={() => applyMarkdown("![alt](", ")")}
          />
          <ToolbarBtn
            icon={Code}
            label="Code Block"
            onClick={() => applyMarkdown("```\n", "\n```")}
          />
        </div>
      </div>
      <div className="rounded-xl border border-m3-outline-variant/20 overflow-hidden shadow-sm">
        <div className="bg-m3-primary/5 border-b border-m3-outline-variant/10 px-4 py-2 flex items-center gap-2">
          <AlignLeft className="h-3.5 w-3.5 text-m3-secondary" />
          <span className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-widest">
            {t("teacher_lesson_manage.editor.label")}
          </span>
          <span className="ml-auto text-xs text-m3-on-surface-variant/50">
            {t("teacher_lesson_manage.editor.hint")}
          </span>
        </div>
        {/* Default to a compact height so the editor doesn't dominate the
            page; teacher drags the bottom-right corner (native resize-y) to
            grow it as needed. */}
        <textarea
          ref={notesRef}
          className="min-h-[240px] w-full p-8 bg-m3-surface-container-lowest text-m3-on-surface leading-relaxed text-base outline-none resize-y font-body placeholder:text-m3-on-surface-variant/40"
          placeholder={
            "# Introduction\n\nWrite your reading material here.\n\n## Key Concepts\n\n- Concept 1\n- Concept 2\n\n**Bold text**, *italic text*, `inline code`"
          }
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </section>
  );
}
