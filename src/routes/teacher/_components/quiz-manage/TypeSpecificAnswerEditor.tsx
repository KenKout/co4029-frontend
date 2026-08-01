import type { ComponentType } from "react";

import { TypeSpecificMatchingEditor } from "./TypeSpecificMatchingEditor";
import { TypeSpecificMultiSelectEditor } from "./TypeSpecificMultiSelectEditor";
import { TypeSpecificNumericalEditor } from "./TypeSpecificNumericalEditor";
import { TypeSpecificOrderingEditor } from "./TypeSpecificOrderingEditor";
import type {
  TypeSpecificEditorProps,
  TypeSpecificValue,
} from "./type-specific-value";

export type { TypeSpecificValue };

/**
 * Phase 7 — teacher answer editor for the expanded question types. Renders the
 * right editor for the given ``questionType``:
 *
 * - ``numerical``  → answer + tolerance number inputs.
 * - ``matching``   → list of {left,right} pairs (add/remove rows).
 * - ``ordering``   → ordered list of items (add/remove/reorder); the stored
 *   order IS the correct sequence (students see it shuffled).
 * - ``multiple_choice`` → single-answer toggle (radio vs checkbox). Option
 *   editing stays in the parent (it owns the option rows).
 *
 * Self-contained (value + onChange per field) so it drops into QuestionCard
 * without bloating quiz-manage.tsx. All values are strings/arrays that map
 * directly to the authoring PATCH payload. The types share no markup, so a
 * type→editor lookup dispatches straight to the one that applies instead of
 * walking a branch chain.
 */
const EDITOR_BY_TYPE: Record<
  string,
  ComponentType<TypeSpecificEditorProps> | undefined
> = {
  numerical: TypeSpecificNumericalEditor,
  matching: TypeSpecificMatchingEditor,
  ordering: TypeSpecificOrderingEditor,
  multiple_choice: TypeSpecificMultiSelectEditor,
};

export function TypeSpecificAnswerEditor({
  questionType,
  value,
  disabled,
  onChange,
}: {
  questionType: string;
  value: TypeSpecificValue;
  disabled?: boolean;
  onChange: (patch: Partial<TypeSpecificValue>) => void;
}) {
  const Editor = EDITOR_BY_TYPE[questionType];
  if (!Editor) return null;
  return <Editor value={value} disabled={disabled} onChange={onChange} />;
}
