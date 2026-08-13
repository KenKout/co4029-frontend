/**
 * Phase 7 — the answer-key slice of a question draft that the per-type editors
 * read and patch. Declared apart from TypeSpecificAnswerEditor so each per-type
 * editor can type its props without importing back from the dispatcher.
 */
export interface TypeSpecificValue {
  single_answer: boolean;
  numeric_answer: string;
  numeric_tolerance: string;
  match_pairs: Array<{ left: string; right: string }>;
  /** Matching distractors: extra unpaired right-side choices. */
  match_distractors: string[];
  ordering_sequence: string[];
  /** Correct answer for short_answer (string) / fill_blank (per-blank list).
   *  Persisted inside original_generated_payload.correct_answer, mirroring
   *  what the AI generator writes. */
  correct_answer: string | string[] | null;
}

export interface TypeSpecificEditorProps {
  value: TypeSpecificValue;
  disabled?: boolean;
  onChange: (patch: Partial<TypeSpecificValue>) => void;
}
