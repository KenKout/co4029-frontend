import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Textarea } from "@/components/ui/textarea";
import { EditorActions } from "./EditorActions";
import { EditorClassificationFields } from "./EditorClassificationFields";
import { EditorTagsField } from "./EditorTagsField";
import type { EditorState } from "./types";

/**
 * The inline row editor, extracted verbatim from the former 843-line
 * course-question-bank.tsx. Keeps the `useTranslation()` + `tagInput` hook pair
 * it always had, and stays the single owner of the draft mutations the tag field
 * calls back into.
 */
export function ItemEditor({
  draft,
  setDraft,
  saving,
  onCancel,
  onSave,
}: {
  draft: EditorState;
  setDraft: (next: EditorState) => void;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const [tagInput, setTagInput] = useState("");

  function addTag() {
    const tag = tagInput.trim();
    if (!tag || draft.tags.includes(tag)) {
      setTagInput("");
      return;
    }
    setDraft({ ...draft, tags: [...draft.tags, tag] });
    setTagInput("");
  }
  function removeTag(tag: string) {
    setDraft({ ...draft, tags: draft.tags.filter((x) => x !== tag) });
  }

  return (
    <div className="animate-[fade-in-up_0.25s_ease-out_both] space-y-3 border-l-2 border-m3-primary bg-m3-primary/[0.02] p-3.5">
      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_question_bank.prompt_label")}
        </label>
        <Textarea
          value={draft.prompt_text}
          onChange={(e) => setDraft({ ...draft, prompt_text: e.target.value })}
          rows={2}
          autoFocus
        />
      </div>

      <EditorClassificationFields draft={draft} setDraft={setDraft} />

      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_question_bank.model_answer")}
        </label>
        <Textarea
          value={draft.model_answer}
          onChange={(e) => setDraft({ ...draft, model_answer: e.target.value })}
          rows={3}
        />
      </div>

      {/* Tags */}
      <EditorTagsField
        draft={draft}
        tagInput={tagInput}
        setTagInput={setTagInput}
        onAddTag={addTag}
        onRemoveTag={removeTag}
      />

      <EditorActions
        draft={draft}
        saving={saving}
        onCancel={onCancel}
        onSave={onSave}
      />
    </div>
  );
}
