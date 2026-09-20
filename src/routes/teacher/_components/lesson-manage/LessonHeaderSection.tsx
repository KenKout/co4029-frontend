import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

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
  const { t } = useTranslation();
  return (
    <section className="space-y-3">
      <span className="block text-m3-secondary font-headline font-bold text-sm tracking-widest uppercase">
        {t("teacher_lesson_manage.header.type", { type: typeLabel })}
      </span>

      {/* Inline editable title */}
      {titleEditing ? (
        <Input
          variant="bare"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => setTitleEditing(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") setTitleEditing(false);
          }}
          className="border-b-2 border-m3-primary py-1 font-headline text-4xl font-extrabold leading-tight tracking-tight text-m3-primary lg:text-5xl"
          placeholder={t("teacher_lesson_manage.header.title_placeholder")}
        />
      ) : (
        <div
          className="group flex items-start gap-3 cursor-text"
          onClick={() => setTitleEditing(true)}
        >
          <h1 className="font-headline font-extrabold text-4xl lg:text-5xl text-m3-primary tracking-tight leading-tight flex-1">
            {title || (
              <span className="text-m3-on-surface-variant/40">
                {t("teacher_lesson_manage.header.untitled")}
              </span>
            )}
          </h1>
          <Button
            variant="ghost"
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
      <Textarea
        variant="bare"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={2}
        className="max-w-2xl bg-transparent px-0 py-1 text-lg text-m3-on-surface-variant placeholder:text-m3-on-surface-variant/30 border-b border-transparent focus:border-m3-outline-variant/40"
        placeholder={t("teacher_lesson_manage.header.summary_placeholder")}
      />
    </section>
  );
}
