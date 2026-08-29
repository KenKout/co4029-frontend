/**
 * The two source selectors of the Generate tab: which course modules the run may
 * draw from, and which learning outcomes it should target.
 *
 * Split out of `generation-section.tsx` (step 9 of the interview-config
 * decomposition). Both are empty-means-everything multi-selects, which is why
 * each carries its own hint and empty state.
 */

import { useTranslation } from "react-i18next";

import type { InterviewOutcomeAuthoring } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Field } from "@/routes/teacher/_components/interview-config/form-primitives";
import type { GenerationFieldsProps } from "@/routes/teacher/_components/interview-config/generation-form-fields";
import { Button } from "@/components/ui/button";

export function GenerationModulePicker({
  generationForm,
  updateGeneration,
  modules,
  ownModuleId,
}: GenerationFieldsProps & {
  modules: { id: string; title: string }[];
  ownModuleId: string;
}) {
  const { t } = useTranslation();
  return (
    <Field
      label={t("teacher_interview_config.generate.modules_label")}
      hint={t("teacher_interview_config.generate.modules_hint")}
    >
      <div className="min-w-0 space-y-2">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {modules.length === 0 ? (
            <p className="text-xs text-m3-on-surface-variant">
              {t("teacher_interview_config.generate.modules_empty")}
            </p>
          ) : (
            modules.map((m) => {
              const selected = generationForm.source_module_ids.includes(m.id);
              const isOwn = m.id === ownModuleId;
              const effectiveSelected =
                selected ||
                (generationForm.source_module_ids.length === 0 && isOwn);
              return (
                <Button
                  variant="ghost"
                  key={m.id}
                  type="button"
                  aria-pressed={effectiveSelected}
                  onClick={() =>
                    updateGeneration(
                      "source_module_ids",
                      selected
                        ? generationForm.source_module_ids.filter(
                            (id) => id !== m.id,
                          )
                        : [...generationForm.source_module_ids, m.id],
                    )
                  }
                  className={cn(
                    "inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-left text-xs leading-4 transition-colors h-auto whitespace-normal break-words",
                    effectiveSelected
                      ? "border-m3-secondary bg-m3-secondary/10 text-m3-secondary font-semibold"
                      : "border-m3-outline-variant/40 bg-m3-surface text-m3-on-surface-variant hover:bg-m3-surface-container-low",
                  )}
                >
                  {m.title}
                  {isOwn && (
                    <span className="text-[10px] opacity-70">
                      {t("teacher_interview_config.generate.modules_own")}
                    </span>
                  )}
                </Button>
              );
            })
          )}
        </div>
      </div>
    </Field>
  );
}

export function GenerationOutcomePicker({
  generationForm,
  updateGeneration,
  outcomes,
}: GenerationFieldsProps & {
  outcomes: InterviewOutcomeAuthoring[];
}) {
  const { t } = useTranslation();
  const allSelected =
    generationForm.target_outcome_ids.length === outcomes.length;
  return (
    <Field
      label={t("teacher_interview_config.generate.outcomes_label")}
      hint={t("teacher_interview_config.generate.outcomes_hint")}
    >
      {outcomes.length === 0 ? (
        <p className="rounded-xl bg-m3-surface p-4 text-sm text-m3-on-surface-variant">
          {t("teacher_interview_config.generate.outcomes_empty")}
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 text-[11px] leading-4 text-m3-on-surface-variant">
              {t("teacher_interview_config.generate.outcomes_optional_hint")}
            </p>
            <Button
              variant="ghost"
              type="button"
              onClick={() =>
                updateGeneration(
                  "target_outcome_ids",
                  allSelected ? [] : outcomes.map((o) => o.id),
                )
              }
              className="shrink-0 text-xs font-semibold text-m3-secondary hover:text-m3-primary cursor-pointer"
            >
              {allSelected
                ? t("teacher_interview_config.generate.outcomes_clear")
                : t("teacher_interview_config.generate.outcomes_select_all")}
            </Button>
          </div>
          {outcomes.map((outcome, index) => (
            <GenerationOutcomeRow
              key={outcome.id}
              outcome={outcome}
              index={index}
              generationForm={generationForm}
              updateGeneration={updateGeneration}
            />
          ))}
        </div>
      )}
    </Field>
  );
}

function GenerationOutcomeRow({
  outcome,
  index,
  generationForm,
  updateGeneration,
}: GenerationFieldsProps & {
  outcome: InterviewOutcomeAuthoring;
  index: number;
}) {
  const { t } = useTranslation();
  const checked = generationForm.target_outcome_ids.includes(outcome.id);
  return (
    <label
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3 py-2 cursor-pointer transition-all",
        checked
          ? "border-m3-secondary bg-m3-secondary-fixed/30"
          : "border-m3-outline-variant/20 bg-m3-surface hover:bg-m3-surface-container-low",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() =>
          updateGeneration(
            "target_outcome_ids",
            checked
              ? generationForm.target_outcome_ids.filter(
                  (id) => id !== outcome.id,
                )
              : [...generationForm.target_outcome_ids, outcome.id],
          )
        }
        className="h-4 w-4"
      />
      {/* Was bg-violet-100/text-violet-700. Purple is banned by
          the design system; it survived because the guard script
          greps a directory that no longer exists and so passes
          unconditionally. Uses the primary token like every other
          index badge in this file. */}
      <span className="shrink-0 rounded-md bg-m3-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-m3-primary">
        {t("teacher_interview_config.generate.outcomes_badge", {
          n: index + 1,
        })}
      </span>
      <span className="min-w-0 flex-1 break-words text-sm leading-5 text-m3-on-surface">
        {outcome.outcome_text}
      </span>
    </label>
  );
}
