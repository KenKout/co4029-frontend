/**
 * Two teacher-facing helpers for the interview-config settings tab: the scoring
 * rubric editor, and the reference sheet describing every AI persona and voice.
 *
 * Split out of `routes/teacher/interview-config.tsx` (step 3 of that file's
 * decomposition). Grouped because both are self-contained reference/editing
 * surfaces hung off the settings form rather than parts of the form itself.
 */

import { useTranslation } from "react-i18next";
import { HelpCircle, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PERSONA_KEYS, VOICE_KEYS } from "@/lib/interview/config-draft";
import {
  type RubricCriterion,
  MAX_CRITERIA,
  MAX_CRITERION_NAME_CHARS,
} from "@/lib/interview/supplementary-instructions";

/**
 * A small "View guide" link that opens a side sheet describing every AI
 * persona and every AI voice in one place. Shown under both the AI persona and
 * AI voice fields so a teacher can look up what each option sounds like before
 * choosing. ``focus`` scrolls/hints which table is most relevant to the field
 * the link sits under, but both tables are always present.
 */
export function RubricEditor({
  criteria,
  onChange,
}: {
  criteria: RubricCriterion[];
  onChange: (next: RubricCriterion[]) => void;
}) {
  const { t } = useTranslation();

  function updateAt(index: number, patch: Partial<RubricCriterion>) {
    onChange(criteria.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function removeAt(index: number) {
    onChange(criteria.filter((_, i) => i !== index));
  }

  function addCriterion() {
    if (criteria.length >= MAX_CRITERIA) return;
    onChange([...criteria, { name: "", weight: 1, description: "" }]);
  }

  const atCap = criteria.length >= MAX_CRITERIA;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_interview_config.fields.rubric_label")}
        </label>
        <p className="text-[11px] text-m3-on-surface-variant">
          {t("teacher_interview_config.fields.rubric_hint")}
        </p>
      </div>

      {criteria.length === 0 ? (
        <p className="rounded-xl border border-dashed border-m3-outline-variant/40 bg-m3-surface px-3 py-4 text-center text-xs text-m3-on-surface-variant">
          {t("teacher_interview_config.fields.rubric_empty")}
        </p>
      ) : (
        <div className="space-y-3">
          {criteria.map((criterion, index) => (
            <div
              key={index}
              className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface p-3 space-y-2"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                    <Input
                      value={criterion.name}
                      maxLength={MAX_CRITERION_NAME_CHARS}
                      onChange={(e) =>
                        updateAt(index, { name: e.target.value })
                      }
                      placeholder={t(
                        "teacher_interview_config.fields.rubric_name_placeholder",
                      )}
                    />
                    <label className="flex items-center gap-2 text-xs text-m3-on-surface-variant">
                      <span className="whitespace-nowrap">
                        {t("teacher_interview_config.fields.rubric_weight")}
                      </span>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={String(criterion.weight)}
                        onChange={(e) =>
                          updateAt(index, {
                            weight: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        className="w-20"
                      />
                    </label>
                  </div>
                  <Textarea
                    value={criterion.description}
                    onChange={(e) =>
                      updateAt(index, { description: e.target.value })
                    }
                    rows={2}
                    placeholder={t(
                      "teacher_interview_config.fields.rubric_description_placeholder",
                    )}
                    className="rounded-lg py-2"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  aria-label={t(
                    "teacher_interview_config.fields.rubric_remove",
                  )}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-m3-on-surface-variant hover:bg-m3-error/10 hover:text-m3-error cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addCriterion}
        disabled={atCap}
        className="gap-1.5"
      >
        <Plus className="h-4 w-4" />
        {atCap
          ? t("teacher_interview_config.fields.rubric_at_cap", {
              max: MAX_CRITERIA,
            })
          : t("teacher_interview_config.fields.rubric_add")}
      </Button>
    </div>
  );
}

export function VoicePersonaGuideSheet({
  focus,
}: {
  focus: "persona" | "voice";
}) {
  const { t } = useTranslation();
  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            type="button"
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-m3-primary hover:underline cursor-pointer"
          />
        }
      >
        <HelpCircle className="h-3 w-3" aria-hidden="true" />
        {t(
          focus === "persona"
            ? "teacher_interview_config.voice_guide.open_persona"
            : "teacher_interview_config.voice_guide.open_voice",
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto p-6 sm:max-w-md">
        <div className="space-y-6">
          <header className="space-y-1 pr-8">
            <h2 className="font-headline text-lg font-extrabold text-m3-on-surface">
              {t("teacher_interview_config.voice_guide.title")}
            </h2>
            <p className="text-xs text-m3-on-surface-variant">
              {t("teacher_interview_config.voice_guide.subtitle")}
            </p>
          </header>

          {/* Persona table */}
          <section
            className={cn(
              "space-y-2",
              focus === "persona" &&
                "rounded-lg ring-1 ring-m3-primary/30 p-2 -m-2",
            )}
          >
            <h3 className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t("teacher_interview_config.voice_guide.persona_heading")}
            </h3>
            <table className="w-full text-left text-xs">
              <tbody>
                {PERSONA_KEYS.map((p) => (
                  <tr
                    key={p}
                    className="border-b border-m3-outline-variant/20 align-top"
                  >
                    <th
                      scope="row"
                      className="whitespace-nowrap py-2 pr-3 font-semibold text-m3-on-surface"
                    >
                      {t(`teacher_interview_config.persona.${p}`)}
                    </th>
                    <td className="py-2 text-m3-on-surface-variant">
                      {t(
                        `teacher_interview_config.voice_guide.persona_desc.${p}`,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Voice table */}
          <section
            className={cn(
              "space-y-2",
              focus === "voice" &&
                "rounded-lg ring-1 ring-m3-primary/30 p-2 -m-2",
            )}
          >
            <h3 className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t("teacher_interview_config.voice_guide.voice_heading")}
            </h3>
            <p className="text-[11px] text-m3-on-surface-variant">
              {t("teacher_interview_config.voice_guide.voice_note")}
            </p>
            <table className="w-full text-left text-xs">
              <tbody>
                {VOICE_KEYS.map((v) => (
                  <tr
                    key={v}
                    className="border-b border-m3-outline-variant/20 align-top"
                  >
                    <th
                      scope="row"
                      className="whitespace-nowrap py-2 pr-3 font-semibold text-m3-on-surface"
                    >
                      {t(`teacher_interview_config.voice.${v}`)}
                    </th>
                    <td className="py-2 text-m3-on-surface-variant">
                      {t(
                        `teacher_interview_config.voice_guide.voice_desc.${v}`,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
