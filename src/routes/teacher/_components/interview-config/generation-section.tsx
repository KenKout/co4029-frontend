/**
 * The Generate tab: kicks off an AI question-generation run and reports its
 * progress, plus the run-progress reader and elapsed-time helpers it needs.
 *
 * Split out of `routes/teacher/interview-config.tsx` (step 5 of that file's
 * decomposition). The progress helpers moved with the section rather than into
 * lib/, because they exist purely to render this panel's live status — nothing
 * else reads them.
 */

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Loader2, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  InterviewGenerationRunPublic,
  InterviewOutcomeAuthoring,
} from "@/lib/api/types";
import type {
  GenerationFormState,
  GenerationMode,
} from "@/lib/interview/config-draft";
import {
  Field,
  Section,
} from "@/routes/teacher/_components/interview-config/form-primitives";

interface GenerationProgress {
  phase: "generating" | "saving" | "completed";
  accepted: number;
  target: number;
  percent: number;
}

/**
 * Reads live generation progress the pipeline writes into
 * `config_json.progress` ({ phase, accepted, target }) each backfill round.
 * Once the run completes, falls back to the pipeline summary's
 * `questions_persisted` / `question_count_requested` so the bar lands on 100%.
 */
function readGenerationProgress(
  run: InterviewGenerationRunPublic | undefined,
): GenerationProgress | null {
  const cfg = run?.config_json as Record<string, unknown> | undefined;
  if (!cfg) return null;

  const toInt = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v)
      ? Math.max(0, Math.floor(v))
      : null;

  // Completed summary takes precedence so the bar always finishes at target.
  const pipeline = cfg.pipeline as Record<string, unknown> | undefined;
  const gen = pipeline?.generation as Record<string, unknown> | undefined;
  if (gen) {
    const target = toInt(gen.question_count_requested);
    const accepted = toInt(gen.questions_persisted);
    if (target !== null && accepted !== null) {
      return {
        phase: "completed",
        accepted,
        target,
        percent:
          target > 0
            ? Math.round((Math.min(accepted, target) / target) * 100)
            : 100,
      };
    }
  }

  const live = cfg.progress as Record<string, unknown> | undefined;
  if (live) {
    const target = toInt(live.target);
    const accepted = toInt(live.accepted);
    const phaseRaw = live.phase;
    const phase =
      phaseRaw === "saving" || phaseRaw === "completed"
        ? phaseRaw
        : "generating";
    if (target !== null && accepted !== null) {
      return {
        phase,
        accepted,
        target,
        percent:
          target > 0
            ? Math.round((Math.min(accepted, target) / target) * 100)
            : 0,
      };
    }
  }

  return null;
}

/** Format seconds as m:ss (matches the quiz generation progress readout). */
function formatElapsedSeconds(seconds: number): string {
  if (seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Live-ticking elapsed timer for a generation run (mirrors the quiz
 * GenerationProgress behaviour). Ticks locally off `startedAt` while running
 * and freezes at `frozenEnd` once the run reaches a terminal state.
 */
function useGenerationElapsed(
  startedAt: string | null | undefined,
  frozenEnd: string | null | undefined,
): number {
  const [now, setNow] = useState(() => Date.now());
  const running = Boolean(startedAt) && !frozenEnd;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  return useMemo(() => {
    if (!startedAt) return 0;
    const start = new Date(startedAt).getTime();
    if (Number.isNaN(start)) return 0;
    const endMs = frozenEnd ? new Date(frozenEnd).getTime() : now;
    const end = Number.isNaN(endMs) ? now : endMs;
    return Math.max(0, (end - start) / 1000);
  }, [startedAt, frozenEnd, now]);
}

export function GenerationSection({
  generationForm,
  setGenerationForm,
  onGenerate,
  generating,
  activeRunId,
  run,
  modules,
  ownModuleId,
  outcomes,
}: {
  generationForm: GenerationFormState;
  setGenerationForm: React.Dispatch<React.SetStateAction<GenerationFormState>>;
  onGenerate: () => void;
  generating: boolean;
  activeRunId: string | null;
  run: InterviewGenerationRunPublic | undefined;
  modules: { id: string; title: string }[];
  ownModuleId: string;
  outcomes: InterviewOutcomeAuthoring[];
}) {
  const { t } = useTranslation();
  function updateGeneration<K extends keyof GenerationFormState>(
    key: K,
    value: GenerationFormState[K],
  ) {
    setGenerationForm((current) => ({ ...current, [key]: value }));
  }

  const inProgress =
    generating ||
    Boolean(
      activeRunId &&
        (!run || run.status === "pending" || run.status === "running"),
    );
  const failed = run?.status === "failed";
  const completed = run?.status === "completed";

  // Live progress the pipeline writes into config_json.progress each round
  // ({ phase, accepted, target }). Falls back to the completed summary's
  // questions_persisted / question_count_requested once the run finishes.
  const progress = readGenerationProgress(run);

  // Live elapsed timer (quiz-style): ticks while running, freezes on finish.
  const isTerminal = failed || completed || run?.status === "cancelled";
  const elapsed = useGenerationElapsed(
    run?.started_at,
    isTerminal ? (run?.finished_at ?? null) : null,
  );

  return (
    <div className="rounded-xl border-2 border-dashed border-m3-secondary/30 bg-m3-secondary/[0.03] p-6 lg:p-8 space-y-5">
      <Section
        title={t("teacher_interview_config.generate.section_title")}
        description={t("teacher_interview_config.generate.section_description")}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t("teacher_interview_config.generate.mode_label")}>
            <Select<GenerationMode>
              value={generationForm.mode}
              onValueChange={(next) => updateGeneration("mode", next)}
              options={[
                {
                  value: "outcome-based",
                  label: t("teacher_interview_config.generate.mode_outcome"),
                },
                {
                  value: "topic",
                  label: t("teacher_interview_config.generate.mode_topic"),
                },
                {
                  value: "coverage",
                  label: t("teacher_interview_config.generate.mode_coverage"),
                },
              ]}
            />
          </Field>
          <Field label={t("teacher_interview_config.generate.count_label")}>
            <Input
              type="number"
              min={1}
              max={50}
              value={generationForm.question_count}
              onChange={(e) =>
                updateGeneration(
                  "question_count",
                  Math.floor(Number(e.target.value)) || 0,
                )
              }
            />
          </Field>
        </div>

        <Field
          label={t("teacher_interview_config.generate.modules_label")}
          hint={t("teacher_interview_config.generate.modules_hint")}
        >
          <div className="flex flex-wrap gap-1.5">
            {modules.length === 0 ? (
              <p className="text-xs text-m3-on-surface-variant">
                {t("teacher_interview_config.generate.modules_empty")}
              </p>
            ) : (
              modules.map((m) => {
                const selected = generationForm.source_module_ids.includes(
                  m.id,
                );
                const isOwn = m.id === ownModuleId;
                const effectiveSelected =
                  selected ||
                  (generationForm.source_module_ids.length === 0 && isOwn);
                return (
                  <button
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
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
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
                  </button>
                );
              })
            )}
          </div>
        </Field>

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
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    updateGeneration(
                      "target_outcome_ids",
                      generationForm.target_outcome_ids.length ===
                        outcomes.length
                        ? []
                        : outcomes.map((o) => o.id),
                    )
                  }
                  className="text-xs font-semibold text-m3-secondary hover:text-m3-primary cursor-pointer"
                >
                  {generationForm.target_outcome_ids.length === outcomes.length
                    ? t("teacher_interview_config.generate.outcomes_clear")
                    : t(
                        "teacher_interview_config.generate.outcomes_select_all",
                      )}
                </button>
              </div>
              {outcomes.map((outcome, index) => {
                const checked = generationForm.target_outcome_ids.includes(
                  outcome.id,
                );
                return (
                  <label
                    key={outcome.id}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer transition-all",
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
                            : [
                                ...generationForm.target_outcome_ids,
                                outcome.id,
                              ],
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
                    <span className="flex-1 text-sm text-m3-on-surface">
                      {outcome.outcome_text}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </Field>

        <Field
          label={t("teacher_interview_config.generate.focus_label")}
          hint={t("teacher_interview_config.generate.focus_hint")}
        >
          <Input
            value={generationForm.focus_topics}
            onChange={(e) => updateGeneration("focus_topics", e.target.value)}
            placeholder={t(
              "teacher_interview_config.generate.focus_placeholder",
            )}
          />
        </Field>

        <Field
          label={t("teacher_interview_config.generate.avoid_label")}
          hint={t("teacher_interview_config.generate.avoid_hint")}
        >
          <Input
            value={generationForm.avoid_topics}
            onChange={(e) => updateGeneration("avoid_topics", e.target.value)}
            placeholder={t(
              "teacher_interview_config.generate.avoid_placeholder",
            )}
          />
        </Field>

        <p className="text-[11px] text-m3-on-surface-variant">
          {t("teacher_interview_config.generate.reuses_settings_hint")}
        </p>

        {activeRunId && (
          <div
            className={cn(
              "rounded-xl px-4 py-3 text-sm border",
              failed
                ? "border-red-200 bg-red-50 text-red-800"
                : completed
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-blue-200 bg-blue-50 text-blue-800",
            )}
          >
            {/* Header: status icon + headline on the left; stepped % (when
                known) + live elapsed timer on the right — mirrors the quiz
                GenerationProgress layout. */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 font-bold">
                {inProgress ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : failed ? (
                  <X className="h-4 w-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">
                  {inProgress
                    ? t("teacher_interview_config.generate.in_progress")
                    : failed
                      ? t("teacher_interview_config.generate.failed")
                      : t("teacher_interview_config.generate.completed")}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs tabular-nums">
                {progress && !failed && (
                  <span className="font-extrabold">
                    {progress.accepted}/{progress.target}
                  </span>
                )}
                <span
                  className="opacity-80"
                  title={t("teacher_interview_config.generate.elapsed")}
                >
                  {formatElapsedSeconds(elapsed)}
                </span>
              </div>
            </div>

            {!failed && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span>
                    {completed
                      ? t("teacher_interview_config.generate.phase_done")
                      : progress?.phase === "saving"
                        ? t("teacher_interview_config.generate.phase_saving")
                        : t(
                            "teacher_interview_config.generate.phase_generating",
                          )}
                  </span>
                  {progress && (
                    <span className="tabular-nums">{progress.percent}%</span>
                  )}
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-current/15">
                  {progress ? (
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-500 ease-out",
                        completed ? "bg-emerald-500" : "bg-blue-500",
                      )}
                      style={{
                        width: `${Math.max(progress.percent, inProgress ? 6 : 0)}%`,
                      }}
                    />
                  ) : (
                    /* No checkpoint yet — indeterminate pulse instead of a fake 0%. */
                    <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-500/60" />
                  )}
                </div>
              </div>
            )}

            {failed && run?.failure_message && (
              <p className="mt-1 text-xs">{run.failure_message}</p>
            )}
            {completed && (
              <p className="mt-1 text-xs">
                {t("teacher_interview_config.generate.success_body")}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-dashed border-m3-secondary/30">
          <p className="text-[11px] text-m3-on-surface-variant">
            {t("teacher_interview_config.generate.independent_action_hint")}
          </p>
          <Button
            type="button"
            onClick={onGenerate}
            disabled={inProgress}
            className="gap-2 gradient-primary text-white border-0 hover:shadow-ai-glow shrink-0"
          >
            {inProgress ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {inProgress
              ? t("teacher_interview_config.generate.processing")
              : t("teacher_interview_config.generate.start_button")}
          </Button>
        </div>
      </Section>
    </div>
  );
}
