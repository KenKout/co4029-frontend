import { useTranslation } from "react-i18next";
import { Plus, Tag, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EditorState } from "./types";

/**
 * The editor's tag field — existing tag chips plus the add-a-tag input —
 * extracted verbatim from the former 843-line course-question-bank.tsx. The
 * `tagInput` state stays with the editor that owns `draft`, so this stays
 * presentational.
 */
export function EditorTagsField({
  draft,
  tagInput,
  setTagInput,
  onAddTag,
  onRemoveTag,
}: {
  draft: EditorState;
  tagInput: string;
  setTagInput: (next: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_question_bank.tags_label")}
      </label>
      <div className="flex flex-wrap items-center gap-1.5">
        {draft.tags.map((tag) => (
          <span
            key={tag}
            // h-7 matches the `sm` Input beside it so the row's top/bottom
            // edges are flush.
            className="inline-flex h-7 animate-[scale-in_0.2s_ease-out_both] items-center gap-1 rounded-full bg-m3-primary-fixed px-2.5 text-[11px] font-semibold text-m3-primary"
          >
            <Tag className="h-3 w-3" />
            {tag}
            <button
              type="button"
              onClick={() => onRemoveTag(tag)}
              aria-label={t("teacher_question_bank.remove_tag", { tag })}
              className="cursor-pointer rounded-full p-0.5 transition-colors hover:bg-red-100 hover:text-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <div className="inline-flex items-center gap-1">
          <Input
            size="sm"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddTag();
              }
            }}
            placeholder={t("teacher_question_bank.add_tag_placeholder")}
            className="w-32"
          />
          {/* Kept alongside Enter-to-commit: on a touch keyboard Enter is
              not always reachable, and the field gives no other hint that it
              commits. Disabled until there is something to add so it can't
              read as a no-op. */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("teacher_question_bank.add_tag")}
            title={t("teacher_question_bank.add_tag")}
            onClick={onAddTag}
            disabled={!tagInput.trim()}
            className="transition-transform duration-150 active:scale-90"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
