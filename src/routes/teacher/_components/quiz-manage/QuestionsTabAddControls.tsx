import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Loader2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  loadAddQuestionType,
  saveAddQuestionType,
  type AddQuestionType,
} from "@/lib/quiz-timing";

/**
 * The manual question types, in menu order. The label key lives in the shared
 * `type_editor` block so it matches the per-card type editor's wording.
 */
const ADD_TYPES: readonly { value: AddQuestionType; labelKey: string }[] = [
  { value: "multiple_choice", labelKey: "type_multiple_choice" },
  { value: "true_false", labelKey: "type_true_false" },
  { value: "short_answer", labelKey: "type_short_answer" },
  { value: "numerical", labelKey: "type_numerical" },
  { value: "matching", labelKey: "type_matching" },
  { value: "ordering", labelKey: "type_ordering" },
];

/**
 * Add-question split button.
 *
 * Was a fixed "+ Add question" button hard-wired to multiple_choice, plus a
 * separate type dropdown whose first row read "+ Other type…" — misleading,
 * because it wasn't another type, it was the type PICKER. Now the primary
 * button seeds whatever type is the current default, its label spells that type
 * out ("+ Add multiple choice"), and the dropdown both switches the default
 * (persisted per-device) and offers a shortcut into the AI generator.
 */
export function QuestionsTabAddControls({
  onAddQuestion,
  onOpenGenerator,
  addPending,
}: {
  onAddQuestion: (questionType?: string) => void | Promise<void>;
  onOpenGenerator?: () => void;
  addPending: boolean;
}) {
  const { t } = useTranslation();
  // The remembered default is the primary click. Switching it via the menu
  // makes the next add default to that type — so authoring a matching-heavy
  // quiz doesn't mean re-opening the menu on every question.
  const [defaultType, setDefaultType] = useState<AddQuestionType>(() =>
    loadAddQuestionType(),
  );

  const labelFor = (type: AddQuestionType) => {
    const entry = ADD_TYPES.find((e) => e.value === type) ?? ADD_TYPES[0];
    return t(`teacher_quiz_manage.type_editor.${entry.labelKey}`);
  };

  function chooseType(type: AddQuestionType) {
    setDefaultType(type);
    saveAddQuestionType(type);
    void onAddQuestion(type);
  }

  return (
    <div className="flex items-stretch">
      {/* Primary: seed the current default type. Label names the type so the
          button is self-describing rather than a generic "Add question". */}
      <Button variant="ghost"
        type="button"
        onClick={() => void onAddQuestion(defaultType)}
        disabled={addPending}
        className="flex-1 min-w-[12rem] flex items-center justify-center gap-2 border-2 border-dashed border-m3-outline-variant/40 rounded-l-xl border-r-0 px-6 py-4 text-sm font-bold text-m3-on-surface-variant hover:border-m3-primary hover:text-m3-primary hover:bg-m3-primary/5 transition-all disabled:opacity-60 cursor-pointer h-auto whitespace-normal"
      >
        {addPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {t("teacher_quiz_manage.actions.add_typed", {
          type: labelFor(defaultType).toLocaleLowerCase(),
        })}
      </Button>

      {/* Dropdown: pick a different type (which becomes the new default) or
          jump to AI generation. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={addPending}
          aria-label={t("teacher_quiz_manage.actions.add_question_menu_label")}
          className="flex items-center justify-center rounded-r-xl border-2 border-dashed border-m3-outline-variant/40 px-3 py-4 text-m3-on-surface-variant hover:border-m3-primary hover:text-m3-primary hover:bg-m3-primary/5 transition-all disabled:opacity-60 cursor-pointer data-popup-open:border-m3-primary data-popup-open:text-m3-primary"
        >
          <ChevronDown className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <span className="block px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_quiz_manage.actions.add_question_type_header")}
          </span>
          {ADD_TYPES.map((entry) => (
            <DropdownMenuItem
              key={entry.value}
              onClick={() => chooseType(entry.value)}
              className="justify-between gap-3"
            >
              <span className="flex items-center gap-2">
                {entry.value === defaultType ? (
                  <Check className="h-4 w-4 text-m3-primary" />
                ) : (
                  <span className="w-4" />
                )}
                {t(`teacher_quiz_manage.type_editor.${entry.labelKey}`)}
              </span>
              {entry.value === defaultType && (
                <span className="rounded-full bg-m3-primary/10 px-2 py-0.5 text-[10px] font-bold text-m3-primary">
                  {t("teacher_quiz_manage.actions.add_default_badge")}
                </span>
              )}
            </DropdownMenuItem>
          ))}
          {onOpenGenerator && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onOpenGenerator()}
                className="gap-2 font-semibold text-m3-primary"
              >
                <Sparkles className="h-4 w-4" />
                {t("teacher_quiz_manage.actions.add_generate_with_ai")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
