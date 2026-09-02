import { useTranslation } from "react-i18next";
import type { Dispatch, SetStateAction } from "react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  CourseLearningOutcomeAuthoring,
  QuizQuestionAuthoring,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import type { QuestionDraft } from "./types";

/**
 * Selects and inputs default to `bg-m3-surface`, which is also the card's own
 * background — so on this card they read as an outline with nothing in it
 * while the textareas beside them are filled white. That was fine when these
 * three lived inside a white configuration panel; on the card they need the
 * fill themselves, or one card shows two kinds of field.
 */
const FIELD_FILL = "bg-m3-surface-container-lowest";

/**
 * Everything about a question that is not the question: which outcome it
 * serves, the hint, how hard it is, how long it should take.
 *
 * These four fields used to be stacked in the same column as the prompt,
 * options and explanation. On a measured five-question quiz that put 280px of
 * settings (31% of a 907px card) between the teacher and the answers, and
 * gave the hint exactly as much vertical weight as the question itself.
 *
 * Running them in a rail beside the content is what buys the height back: the
 * rail is shorter than the content column, so the space it occupies was free.
 * It also puts the two fields a reviewer checks WHILE reading the question —
 * outcome and hint — beside it rather than above and below it.
 *
 * Everything here uses the SAME controls at the SAME scale as the left column:
 * no panel wrapper, no `size="sm"`, no `text-xs`. The first version shrank all
 * of it as though the rail were cramped, which made the two halves of one card
 * look like two different components. It was never cramped — measured, the
 * rail fills roughly 280px of a ~560px column, so the full-size controls cost
 * nothing and the card height is unchanged.
 */
export function QuestionCardMetaRail({
  question,
  draft,
  setDraft,
  outcomes,
  draftTimeInvalid,
}: {
  question: QuizQuestionAuthoring;
  draft: QuestionDraft;
  setDraft: Dispatch<SetStateAction<QuestionDraft>>;
  outcomes: CourseLearningOutcomeAuthoring[];
  draftTimeInvalid: boolean;
}) {
  const { t } = useTranslation();

  return (
    // No panel chrome. Wrapping the rail in its own bordered, filled box made
    // it read as a different kind of component from the left column, which is
    // just labels and fields on the card — and because the box was
    // `surface-container-lowest` (white), the hint textarea inside it (also
    // white, `variant="lowest"`) lost its border entirely and rendered as bare
    // text while the question opposite had a clearly drawn field. Same
    // treatment both sides; the column gap does the separating.
    <aside className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_quiz_manage.outcome.label", "Learning outcome")}
        </label>
        <Select<string>
          value={draft.learning_outcome_id ?? ""}
          onValueChange={(next) =>
            setDraft((current) => ({
              ...current,
              learning_outcome_id: next || null,
            }))
          }
          className={FIELD_FILL}
          options={[
            {
              value: "",
              label: t("teacher_quiz_manage.outcome.none", "No outcome"),
            },
            ...outcomes.map((outcome) => ({
              value: outcome.id,
              // The select ellipsises on its own; this only stops a very long
              // outcome from making the dropdown list unreadable.
              label: `${" ".repeat((outcome.depth ?? 0) * 2)}L.O.${
                outcome.code ?? outcome.position
              } — ${
                outcome.outcome_text.length > 48
                  ? `${outcome.outcome_text.slice(0, 48)}…`
                  : outcome.outcome_text
              }`,
            })),
          ]}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_quiz_manage.editor.hint_label", "Hint")}
        </label>
        <Textarea
          value={draft.hint_text}
          onChange={(e) =>
            setDraft((current) => ({ ...current, hint_text: e.target.value }))
          }
          rows={2}
          autoGrow
          variant="lowest"
          placeholder={t(
            "teacher_quiz_manage.editor.hint_placeholder",
            "e.g. Think about which property distinguishes analytical storage from transactional storage.",
          )}
        />
        <p className="text-[11px] leading-snug text-m3-on-surface-variant">
          {t(
            "teacher_quiz_manage.editor.hint_help",
            'Optional. Only shown to learners if "Show hints" is enabled in Quiz Settings. Must not reveal the answer.',
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_quiz_manage.editor.difficulty_label", "Difficulty")}
          </label>
          <Select<string>
            value={draft.difficulty}
            onValueChange={(next) =>
              setDraft((current) => ({ ...current, difficulty: next }))
            }
            options={["easy", "medium", "hard"].map((level) => ({
              value: level,
              label: level,
            }))}
            className={cn("capitalize", FIELD_FILL)}
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor={`qexp-${question.id}`}
            className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant"
          >
            {t("teacher_quiz_manage.editor.t_exp_label", "Expected time (s)")}
            {/* Required marker — the SR scheduler divides by this value. */}
            <span className="ml-0.5 text-red-600" aria-hidden="true">
              *
            </span>
          </label>
          <Input
            id={`qexp-${question.id}`}
            type="number"
            min={1}
            max={600}
            required
            aria-invalid={draftTimeInvalid || undefined}
            aria-describedby={
              draftTimeInvalid ? `qexp-err-${question.id}` : undefined
            }
            value={draft.expected_response_seconds ?? ""}
            placeholder={t(
              "teacher_quiz_manage.editor.t_exp_placeholder",
              "e.g. 45",
            )}
            onChange={(e) =>
              setDraft((current) => ({
                ...current,
                expected_response_seconds:
                  e.target.value === "" ? null : Number(e.target.value),
              }))
            }
            className={cn(
              FIELD_FILL,
              draftTimeInvalid && "border-red-500 focus-visible:ring-red-500/30",
            )}
          />
          {draftTimeInvalid && (
            <p
              id={`qexp-err-${question.id}`}
              className="text-[10px] font-semibold text-red-600"
            >
              {t("teacher_quiz_manage.errors.expected_time_required")}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
