import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import { QUESTION_TYPE_LABELS } from "./constants";
import { AppendToggle, ModeToggle } from "./ModeToggles";
import { DIFFICULTIES, QUESTION_TYPES, type Difficulty } from "./types";
import type { QuizGenerationController } from "./use-quiz-generation-panel";

function CountAndDifficulty({
  controller,
}: {
  controller: QuizGenerationController;
}) {
  const { form, setForm, t } = controller;
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("quiz_generation.settings.questions")}
        </label>
        <Input
          type="number"
          min={1}
          max={50}
          value={form.question_count}
          onChange={(e) =>
            setForm((current) => ({
              ...current,
              question_count: Math.min(
                50,
                Math.max(1, Number(e.target.value) || 1),
              ),
            }))
          }
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("quiz_generation.settings.difficulty")}
        </label>
        <Select<Difficulty>
          aria-label={t("quiz_generation.settings.difficulty")}
          value={form.difficulty}
          onValueChange={(next) =>
            setForm((current) => ({ ...current, difficulty: next }))
          }
          options={DIFFICULTIES.map((level) => ({
            value: level,
            label: t(`quiz_generation.difficulty.${level}`),
          }))}
        />
      </div>
    </div>
  );
}

function QuestionTypesPicker({
  controller,
}: {
  controller: QuizGenerationController;
}) {
  const { form, setForm, t } = controller;
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("quiz_generation.settings.question_types")}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {QUESTION_TYPES.map((type) => {
          const checked = form.question_types.includes(type);
          return (
            <label
              key={type}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all",
                checked
                  ? "border-m3-secondary bg-m3-secondary-fixed/30"
                  : "border-m3-outline-variant/20 bg-m3-surface hover:bg-m3-surface-container-low",
              )}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(isChecked) =>
                  setForm((current) => {
                    const next = isChecked
                      ? [...current.question_types, type]
                      : current.question_types.filter(
                          (entry) => entry !== type,
                        );
                    return { ...current, question_types: next };
                  })
                }
                className="h-3.5 w-3.5"
              />
              <span className="text-m3-on-surface">
                {t(`quiz_generation.question_types.${type}`, {
                  defaultValue: QUESTION_TYPE_LABELS[type],
                })}
              </span>
            </label>
          );
        })}
      </div>
      <p className="text-[10px] text-m3-on-surface-variant">
        {t("quiz_generation.settings.question_types_hint")}
      </p>
    </div>
  );
}

/**
 * Right column of the generation grid: how to generate — count, difficulty,
 * question types, topic-vs-coverage mode and the append/replace choice.
 */
export function GenerationSettingsColumn({
  controller,
}: {
  controller: QuizGenerationController;
}) {
  const { form, setForm, hasExistingQuestions, t } = controller;
  return (
    <div className="space-y-4">
      <CountAndDifficulty controller={controller} />

      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("quiz_generation.settings.expected_time")}
        </label>
        <Input
          type="number"
          min={1}
          value={form.expected_response_seconds}
          onChange={(e) =>
            setForm((current) => ({
              ...current,
              expected_response_seconds: Math.max(
                1,
                Number(e.target.value) || 60,
              ),
            }))
          }
        />
        <p className="text-[10px] text-m3-on-surface-variant">
          {t("quiz_generation.settings.expected_time_hint")}
        </p>
      </div>

      <QuestionTypesPicker controller={controller} />

      <ModeToggle
        mode={form.generation_mode}
        onChange={(mode) =>
          setForm((current) => ({ ...current, generation_mode: mode }))
        }
      />

      {hasExistingQuestions && (
        <AppendToggle
          append={form.append}
          hasExistingQuestions={hasExistingQuestions}
          onChange={(value) =>
            setForm((current) => ({ ...current, append: value }))
          }
        />
      )}
    </div>
  );
}
