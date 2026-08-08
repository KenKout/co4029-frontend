import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Editable lesson header: the lesson-type eyebrow, the click-to-edit title
 * (swaps to an input on click, commits on blur / Enter / Escape) and the
 * always-editable summary textarea.
 */
export function LessonHeaderSection({
  typeLabel,
  title,
  setTitle,
  titleEditing,
  setTitleEditing,
  summary,
  setSummary,
}: {
  typeLabel: string;
  title: string;
  setTitle: (v: string) => void;
  titleEditing: boolean;
  setTitleEditing: (v: boolean) => void;
  summary: string;
  setSummary: (v: string) => void;
}) {
  return (
    <section className="space-y-3">
      <span className="block text-m3-secondary font-headline font-bold text-sm tracking-widest uppercase">
        {typeLabel} Lesson
      </span>

      {/* Inline editable title */}
      {titleEditing ? (
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => setTitleEditing(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") setTitleEditing(false);
          }}
          className="w-full font-headline font-extrabold text-4xl lg:text-5xl text-m3-primary tracking-tight leading-tight bg-transparent border-b-2 border-m3-primary outline-none py-1"
          placeholder="Lesson title…"
        />
      ) : (
        <div
          className="group flex items-start gap-3 cursor-text"
          onClick={() => setTitleEditing(true)}
        >
          <h1 className="font-headline font-extrabold text-4xl lg:text-5xl text-m3-primary tracking-tight leading-tight flex-1">
            {title || (
              <span className="text-m3-on-surface-variant/40">
                Untitled Lesson
              </span>
            )}
          </h1>
          <Button variant="ghost"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTitleEditing(true);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity mt-2 p-2 rounded-xl hover:bg-m3-surface-container-high text-m3-on-surface-variant shrink-0 cursor-pointer h-auto whitespace-normal"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Editable summary */}
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={2}
        className="w-full text-m3-on-surface-variant text-lg max-w-2xl leading-relaxed bg-transparent outline-none resize-none placeholder:text-m3-on-surface-variant/30 border-b border-transparent focus:border-m3-outline-variant/40 transition-colors py-1"
        placeholder="Add a brief summary of this lesson…"
      />
    </section>
  );
}
