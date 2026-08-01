import { useMemo, useState } from "react";

import type { CoverageOptionsPatch } from "../quiz-generation-form-controls";
import { INITIAL_FORM } from "./constants";
import type { FormState } from "./types";

/**
 * Local form state for the quiz generation panel: the source-lesson
 * selection, the advanced disclosure flag and the snake_case form record,
 * plus the Bloom totals derived from them.
 *
 * Default to APPEND when the quiz already has questions — replacing (wiping)
 * existing questions is the destructive, rarely-wanted choice, so it should
 * never be the default. INITIAL_FORM.append is false; override at init time
 * based on whether questions exist.
 */
export function useGenerationForm(hasExistingQuestions: boolean) {
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState<FormState>(() => ({
    ...INITIAL_FORM,
    append: hasExistingQuestions,
  }));

  const isCoverageMode = form.generation_mode === "coverage";
  const bloomTotal = useMemo(
    () =>
      Object.values(form.bloom_distribution).reduce(
        (sum, value) => sum + value,
        0,
      ),
    [form.bloom_distribution],
  );
  const bloomOverflow = form.bloom_enabled && bloomTotal > form.question_count;

  function toggleLesson(lessonId: string) {
    setSelectedLessonIds((current) =>
      current.includes(lessonId)
        ? current.filter((id) => id !== lessonId)
        : [...current, lessonId],
    );
  }

  function setSelectedSectionIds(lessonId: string, sectionIds: string[]) {
    setForm((current) => ({
      ...current,
      selected_section_ids: {
        ...current.selected_section_ids,
        [lessonId]: sectionIds,
      },
    }));
  }

  function patchForm(patch: CoverageOptionsPatch) {
    setForm((current) => ({ ...current, ...patch }));
  }

  return {
    form,
    setForm,
    selectedLessonIds,
    setSelectedLessonIds,
    showAdvanced,
    setShowAdvanced,
    isCoverageMode,
    bloomOverflow,
    toggleLesson,
    setSelectedSectionIds,
    patchForm,
  };
}
