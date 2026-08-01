import {
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  Code,
  Image,
} from "lucide-react";
import { ToolbarBtn, makeMarkdownApplier } from "./markdown-editor";

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
  const { applyMarkdown, applyBlock } = makeMarkdownApplier(
    () => notesRef.current,
    () => notes,
    setNotes,
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-headline font-bold text-2xl text-m3-primary">
          Lesson Notes
        </h2>
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
        className="min-h-[400px] w-full p-8 rounded-xl bg-m3-surface-container-lowest text-m3-on-surface leading-relaxed text-base outline-none shadow-sm focus:ring-2 focus:ring-m3-secondary/20 transition-all resize-none font-body border border-m3-outline-variant/10 placeholder:text-m3-on-surface-variant/40"
        placeholder={
          "Write lesson notes in Markdown…\n\nYou can use **bold**, *italic*, lists, code blocks, and more."
        }
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
    </section>
  );
}
