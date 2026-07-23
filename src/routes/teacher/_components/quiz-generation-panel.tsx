/**
 * Quiz generation panel — main orchestrator (T5.14, FR-5).
 *
 * Adapted from
 * ``git show 8671e3b:src/routes/teacher/module-manage.tsx`` lines
 * 1542-2016, with the following deltas required by the post-W5
 * "panel home moved to quiz-manage" architecture:
 *
 * 1. **Per-quiz, not per-module.** The legacy panel created a new
 *    quiz from a module and managed the draft → publish lifecycle.
 *    Here the quiz already exists (quiz-manage is per-quiz), so we
 *    drop title/description form fields, the publish button, the
 *    draft-quiz tracking, and the embedded review pane (quiz-manage
 *    has its own question list).
 * 2. **Source lessons come from `useModuleLessons`**, not from a
 *    pre-walked `module.items` array. The picker shows every lesson
 *    in the quiz's parent module — the user picks which lessons to
 *    pull material from.
 * 3. **Strict FR-5 payload.** Sends ``question_types:
 *    ["multiple_choice"]`` (the new DB CHECK literal — legacy ``mcq``
 *    is rejected by the backend), ``coverage_options`` matching the
 *    backend ``CoverageOptions`` schema (``min_per_section``,
 *    ``max_per_section``, ``skip_summaries``, ``slides_per_section``,
 *    ``section_ids``), and ``bloom_distribution`` as a
 *    sparse map (only non-zero levels).
 * 4. **Active run polling via `useQuizGenerationRun`** — the existing
 *    nested-route hook (already at ``quizzes.ts:285``) replaces the
 *    legacy flat-route ``useGenerationRun``.
 *
 * Strings are kept in English to match the surrounding quiz-manage
 * surface — they will be threaded through ``useTranslation`` in a
 * follow-up i18n pass alongside the rest of the route.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageSquare,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { useAuthoringModuleLessons } from "@/lib/api/hooks/teacher-courses";
import { useTeacherCourseOutcomes } from "@/lib/api/hooks/courses";
import {
  useGenerateQuiz,
  useLatestQuizGenerationRun,
  useQuizGenerationRun,
} from "@/lib/api/hooks/quizzes";
import { cn } from "@/lib/utils";
import {
  BLOOM_LEVELS,
  type BloomDistribution,
  BloomDistributionInput,
  CoverageOptionsForm,
  type CoverageOptionsPatch,
  CoverageSectionPicker,
  EMPTY_BLOOM_DISTRIBUTION,
  TopicTagInput,
} from "./quiz-generation-form-controls";
import { GenerationProgress } from "./quiz-results/GenerationProgress";

/**
 * Difficulty levels accepted by the backend's
 * ``QuizGenerationRequest.difficulty`` field. ``mixed`` lets the
 * generator vary difficulty across the question set.
 */
const DIFFICULTIES = ["easy", "medium", "hard", "mixed"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

/**
 * Question types accepted by the backend's
 * ``QuizGenerationRequest.question_types`` field. The ideation stage
 * cycles through the selected types when allocating per-section
 * budgets — pick at least one. Default is `multiple_choice` to match
 * the historical behavior.
 */
const QUESTION_TYPES = [
  "multiple_choice",
  "true_false",
  "short_answer",
  "fill_blank",
] as const;
type QuestionType = (typeof QUESTION_TYPES)[number];

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple choice",
  true_false: "True / false",
  short_answer: "Short answer",
  fill_blank: "Fill in the blank",
};

type GenerationMode = "topic" | "coverage";

/**
 * Form state — typed as a single record so the panel can update fields
 * idiomatically with ``setForm((current) => ({ ...current, ... }))``.
 *
 * Fields named with snake_case mirror the backend payload directly so
 * the form-to-payload translation in ``buildPayload`` is mechanical.
 */
interface FormState {
  question_count: number;
  difficulty: Difficulty;
  question_types: QuestionType[];
  generation_mode: GenerationMode;
  focus_topics: string[];
  avoid_topics: string[];
  extra_instructions: string;
  append: boolean;
  coverage_min_per_section: number;
  coverage_max_per_section: number;
  skip_summaries: boolean;
  slides_per_section: number;
  section_grouping: "auto" | "fixed";
  /** Map of lesson_id → checked section_ids, keyed for stable updates. */
  selected_section_ids: Record<string, string[]>;
  bloom_enabled: boolean;
  bloom_distribution: BloomDistribution;
  /** Course learning-outcome ids the generated questions should target. */
  target_outcome_ids: string[];
}

const INITIAL_FORM: FormState = {
  question_count: 5,
  difficulty: "medium",
  question_types: ["multiple_choice"],
  generation_mode: "topic",
  focus_topics: [],
  avoid_topics: [],
  extra_instructions: "",
  append: false,
  coverage_min_per_section: 1,
  coverage_max_per_section: 5,
  skip_summaries: true,
  slides_per_section: 4,
  section_grouping: "auto",
  selected_section_ids: {},
  bloom_enabled: false,
  bloom_distribution: { ...EMPTY_BLOOM_DISTRIBUTION },
  target_outcome_ids: [],
};

/**
 * Generation-mode segmented toggle. Two options: topic (balanced
 * spread) vs coverage (one-or-more per section).
 */
function ModeToggle({
  mode,
  onChange,
}: {
  mode: GenerationMode;
  onChange: (mode: GenerationMode) => void;
}) {
  const options: Array<{ key: GenerationMode; label: string; hint: string }> = [
    {
      key: "topic",
      label: "Topic",
      hint: "Balanced spread across all lessons",
    },
    {
      key: "coverage",
      label: "Coverage",
      hint: "One+ question per lesson section",
    },
  ];

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
        Generation mode
      </label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const active = mode === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange(option.key)}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer",
                active
                  ? "border-m3-secondary bg-m3-secondary-fixed/30 shadow-sm"
                  : "border-m3-outline-variant/20 bg-m3-surface hover:bg-m3-surface-container-low",
              )}
            >
              <span className="text-sm font-semibold text-m3-on-surface">
                {option.label}
              </span>
              <span className="text-[11px] text-m3-on-surface-variant">
                {option.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Append-vs-replace toggle (FR-10b). Visible only when the quiz has
 * existing questions — replace will wipe them before generating.
 */
function AppendToggle({
  append,
  hasExistingQuestions,
  onChange,
}: {
  append: boolean;
  hasExistingQuestions: boolean;
  onChange: (append: boolean) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
        Existing questions
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(false)}
          aria-pressed={!append}
          className={cn(
            "flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer",
            !append
              ? "border-m3-secondary bg-m3-secondary-fixed/30 shadow-sm"
              : "border-m3-outline-variant/20 bg-m3-surface hover:bg-m3-surface-container-low",
          )}
        >
          <span className="text-sm font-semibold text-m3-on-surface">
            Replace
          </span>
          <span className="text-[11px] text-m3-on-surface-variant">
            Wipe current questions and start fresh
          </span>
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          aria-pressed={append}
          className={cn(
            "flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer",
            append
              ? "border-m3-secondary bg-m3-secondary-fixed/30 shadow-sm"
              : "border-m3-outline-variant/20 bg-m3-surface hover:bg-m3-surface-container-low",
          )}
        >
          <span className="text-sm font-semibold text-m3-on-surface">
            Append
          </span>
          <span className="text-[11px] text-m3-on-surface-variant">
            Add new questions next to existing ones
          </span>
        </button>
      </div>
      {hasExistingQuestions && !append && (
        <p className="text-[11px] text-amber-700 flex items-start gap-1.5 mt-1">
          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
          This quiz already has questions. Replace will delete them before
          generating.
        </p>
      )}
    </div>
  );
}

/**
 * Filter a sparse Bloom map down to non-zero entries — the backend
 * treats absent keys and 0-valued keys the same (let the generator
 * decide), but a sparse payload keeps wire traffic small and matches
 * the legacy behaviour.
 */
function buildBloomDistribution(
  enabled: boolean,
  distribution: BloomDistribution,
): Record<string, number> {
  if (!enabled) return {};
  const filtered: Record<string, number> = {};
  for (const [level, count] of Object.entries(distribution)) {
    if (count > 0) filtered[level] = count;
  }
  return filtered;
}

/**
 * Build the ``coverage_options`` sub-payload. Returns ``null`` for
 * topic mode; the backend interprets ``null`` as "no coverage
 * planning, use topic-mode pipeline".
 *
 * ``section_ids`` collapses the per-lesson section map into a flat,
 * deduplicated list; ``null`` (rather than an empty list) means
 * "include every eligible section for the selected lessons".
 */
function buildCoverageOptions(
  form: FormState,
  readyLessonIds: string[],
): {
  min_per_section: number;
  max_per_section: number;
  skip_summaries: boolean;
  slides_per_section: number;
  section_grouping: "auto" | "fixed";
  section_ids: string[] | null;
} | null {
  if (form.generation_mode !== "coverage") return null;
  const sectionIds = readyLessonIds
    .flatMap((lessonId) => form.selected_section_ids[lessonId] ?? [])
    .filter((value, index, array) => array.indexOf(value) === index);
  return {
    min_per_section: form.coverage_min_per_section,
    max_per_section: form.coverage_max_per_section,
    skip_summaries: form.skip_summaries,
    slides_per_section: form.slides_per_section,
    section_grouping: form.section_grouping,
    section_ids: sectionIds.length > 0 ? sectionIds : null,
  };
}

/**
 * Quiz generation panel for the per-quiz manage route.
 *
 * Renders a generate-only control surface (no review pane, no
 * publish button — quiz-manage handles those itself). The flow:
 *
 * 1. User picks one or more source lessons from the quiz's module.
 * 2. Sets question count + difficulty.
 * 3. Picks topic vs coverage mode (and optionally the section
 *    subset, advanced personalisation, Bloom distribution).
 * 4. Clicks "Generate" — kicks off
 *    ``POST /teacher/quizzes/{quizId}/generate`` and starts polling
 *    the resulting run via ``useQuizGenerationRun``.
 *
 * The panel does NOT auto-close or auto-refresh question lists when
 * the run completes — the parent (quiz-manage) is responsible for
 * surfacing newly-generated questions via its own queries, which the
 * mutation hook invalidates on success.
 *
 * @param quizId - UUID of the quiz to generate questions into.
 * @param moduleId - UUID of the quiz's parent module; drives the
 *   source-lesson picker.
 * @param hasExistingQuestions - whether the quiz already has
 *   questions; gates the append/replace toggle visibility.
 * @param onRunStarted - optional callback fired once the backend
 *   accepts the request and a run is enqueued. Useful for closing
 *   the surrounding modal/sheet.
 */
export function QuizGenerationPanel({
  quizId,
  moduleId,
  courseId,
  hasExistingQuestions,
  onRunStarted,
}: {
  quizId: string;
  moduleId: string;
  courseId?: string;
  hasExistingQuestions: boolean;
  onRunStarted?: (runId: string) => void;
}) {
  const { t } = useTranslation();
  const generateQuiz = useGenerateQuiz(quizId);
  const { data: lessons = [] } = useAuthoringModuleLessons(moduleId);
  const { data: outcomes = [] } = useTeacherCourseOutcomes(courseId);
  // Reattach to the latest server-side run on mount instead of
  // persisting the run id in the browser. Survives cross-device
  // sessions, tab closes, and lets two teachers viewing the same
  // quiz both see the in-flight run.
  //
  // Only auto-reattach a NON-TERMINAL run (pending/running). A completed
  // or failed run is shown as a dismissible "last result" via
  // `displayRun` below — reattaching it to `activeRunId` was the bug
  // where clicking Generate just surfaced an already-finished run's data
  // instead of starting fresh.
  const { data: latestRun } = useLatestQuizGenerationRun(quizId);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  useEffect(() => {
    if (activeRunId) return;
    if (
      latestRun?.id &&
      (latestRun.status === "pending" || latestRun.status === "running")
    ) {
      setActiveRunId(latestRun.id);
    }
  }, [latestRun?.id, latestRun?.status, activeRunId]);
  const { data: activeRun } = useQuizGenerationRun(quizId, activeRunId);

  // The run to visualise: the live one if attached, else the most recent
  // finished run so the teacher still sees "last generation" context
  // (stepper collapsed to done + logs) without it blocking a new run.
  const displayRun = activeRun ?? (activeRunId ? undefined : latestRun) ?? null;

  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

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

  const generationInProgress =
    generateQuiz.isPending ||
    Boolean(
      activeRunId &&
        (!activeRun ||
          activeRun.status === "pending" ||
          activeRun.status === "running"),
    );

  // Surface terminal-state toasts exactly once per run id (the
  // polling hook re-runs on every refetch — without the ref guard
  // we'd fire the toast on every successful 3s tick).
  const toastedRunIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeRun || !activeRunId) return;
    const status = activeRun.status;
    if (
      status !== "completed" &&
      status !== "failed" &&
      status !== "cancelled"
    ) {
      return;
    }
    if (toastedRunIdRef.current === activeRunId) return;
    toastedRunIdRef.current = activeRunId;

    if (status === "completed") {
      toast.success("Quiz generation completed");
    } else if (status === "failed") {
      toast.error(activeRun.error_message ?? "Quiz generation failed", {
        duration: 8000,
      });
    } else {
      toast.info("Quiz generation cancelled");
    }
  }, [activeRun, activeRunId]);

  function toggleLesson(lessonId: string) {
    setSelectedLessonIds((current) =>
      current.includes(lessonId)
        ? current.filter((id) => id !== lessonId)
        : [...current, lessonId],
    );
  }

  function toggleOutcome(outcomeId: string) {
    setForm((current) => ({
      ...current,
      target_outcome_ids: current.target_outcome_ids.includes(outcomeId)
        ? current.target_outcome_ids.filter((id) => id !== outcomeId)
        : [...current.target_outcome_ids, outcomeId],
    }));
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

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (selectedLessonIds.length === 0) {
      toast.error("Select at least one source lesson");
      return;
    }
    if (form.coverage_min_per_section > form.coverage_max_per_section) {
      toast.error("Min per section cannot exceed max per section");
      return;
    }
    if (bloomOverflow) {
      toast.error("Bloom distribution exceeds total question count");
      return;
    }
    if (form.extra_instructions.length > 1000) {
      toast.error("Extra instructions must be 1000 characters or fewer");
      return;
    }
    if (form.question_types.length === 0) {
      toast.error("Pick at least one question type");
      return;
    }

    try {
      const run = await generateQuiz.mutateAsync({
        question_count: form.question_count,
        question_types: form.question_types,
        difficulty: form.difficulty,
        source_lesson_ids: selectedLessonIds,
        generation_mode: form.generation_mode,
        focus_topics: form.focus_topics,
        avoid_topics: form.avoid_topics,
        extra_instructions: form.extra_instructions.trim() || null,
        append: hasExistingQuestions ? form.append : false,
        coverage_options: buildCoverageOptions(form, selectedLessonIds),
        bloom_distribution: buildBloomDistribution(
          form.bloom_enabled,
          form.bloom_distribution,
        ),
        target_outcome_ids: form.target_outcome_ids,
      });
      setActiveRunId(run.id);
      onRunStarted?.(run.id);
      toast.success("Quiz generation started");
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(
          "A generation is still running for this quiz. Refresh in a moment.",
        );
        return;
      }
      toast.error((err as Error).message || "Failed to start quiz generation");
    }
  }

  return (
    <form onSubmit={handleGenerate} className="space-y-4">
      {/* ── Source lessons picker ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            Source lessons
          </label>
          <button
            type="button"
            disabled={lessons.length === 0}
            onClick={() => setSelectedLessonIds(lessons.map((l) => l.id))}
            className="text-xs font-semibold text-m3-secondary hover:text-m3-primary disabled:text-m3-on-surface-variant/50 disabled:cursor-not-allowed cursor-pointer"
          >
            Select all
          </button>
        </div>
        <div className="space-y-2">
          {lessons.length === 0 ? (
            <div className="rounded-xl bg-m3-surface p-4 text-sm text-m3-on-surface-variant text-center">
              This module has no lessons yet. Add a lesson with AI-ready
              material before generating.
            </div>
          ) : (
            lessons.map((lesson) => {
              const checked = selectedLessonIds.includes(lesson.id);
              return (
                <label
                  key={lesson.id}
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
                    onChange={() => toggleLesson(lesson.id)}
                    className="h-4 w-4"
                  />
                  <span className="flex-1 text-sm font-semibold text-m3-on-surface truncate">
                    {lesson.title}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>

      {/* ── Target learning outcomes ── */}
      {courseId && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t("quiz_generation.outcomes.label", "Target learning outcomes")}
            </label>
            {outcomes.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    target_outcome_ids: outcomes.map((o) => o.id),
                  }))
                }
                className="text-xs font-semibold text-m3-secondary hover:text-m3-primary cursor-pointer"
              >
                {t("quiz_generation.outcomes.select_all", "Select all")}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {outcomes.length === 0 ? (
              <div className="rounded-xl bg-m3-surface p-4 text-sm text-m3-on-surface-variant text-center">
                {t(
                  "quiz_generation.outcomes.empty",
                  "No learning outcomes defined for this course yet. Questions will be generated without outcome tagging.",
                )}
              </div>
            ) : (
              outcomes.map((outcome, index) => {
                const checked = form.target_outcome_ids.includes(outcome.id);
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
                      onChange={() => toggleOutcome(outcome.id)}
                      className="h-4 w-4"
                    />
                    <span className="shrink-0 rounded-md bg-violet-100 px-1.5 py-0.5 text-[11px] font-bold text-violet-700">
                      {t("quiz_generation.outcomes.badge", "L.O.{{n}}", {
                        n: index + 1,
                      })}
                    </span>
                    <span className="flex-1 text-sm text-m3-on-surface">
                      {outcome.outcome_text}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── Question count + difficulty ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            Questions
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
            className="bg-m3-surface text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            Difficulty
          </label>
          <select
            value={form.difficulty}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                difficulty: e.target.value as Difficulty,
              }))
            }
            className="h-8 w-full rounded-lg border border-m3-outline-variant/20 bg-m3-surface px-2.5 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
          >
            {DIFFICULTIES.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Question types ── */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          Question types
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
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    setForm((current) => {
                      const next = e.target.checked
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
                  {QUESTION_TYPE_LABELS[type]}
                </span>
              </label>
            );
          })}
        </div>
        <p className="text-[10px] text-m3-on-surface-variant">
          Generator cycles through the selected types when budgeting per
          section. Pick at least one.
        </p>
      </div>

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

      {isCoverageMode && (
        <CoverageSectionPicker
          lessons={lessons}
          selectedLessonIds={selectedLessonIds}
          selectedSectionIds={form.selected_section_ids}
          slidesPerSection={form.slides_per_section}
          sectionGrouping={form.section_grouping}
          onSectionsChange={setSelectedSectionIds}
          onSuggestQuestionCount={(count) =>
            setForm((current) => ({
              ...current,
              question_count: Math.min(20, Math.max(1, count)),
            }))
          }
        />
      )}

      <button
        type="button"
        onClick={() => setShowAdvanced((current) => !current)}
        className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-m3-secondary hover:text-m3-primary cursor-pointer"
      >
        {showAdvanced ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        Advanced personalisation
      </button>

      {showAdvanced && (
        <div className="space-y-4 rounded-xl border border-m3-outline-variant/20 bg-m3-surface p-4">
          <TopicTagInput
            label="Focus topics"
            hint="The generator will lean toward these topics. Up to 10 entries, 200 chars each."
            icon={Tag}
            values={form.focus_topics}
            onChange={(values) =>
              setForm((current) => ({ ...current, focus_topics: values }))
            }
          />

          <TopicTagInput
            label="Avoid topics"
            hint="The generator will steer clear of these topics."
            icon={X}
            values={form.avoid_topics}
            onChange={(values) =>
              setForm((current) => ({ ...current, avoid_topics: values }))
            }
          />

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Extra instructions
            </label>
            <textarea
              value={form.extra_instructions}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  extra_instructions: e.target.value,
                }))
              }
              rows={3}
              maxLength={1000}
              placeholder="Any extra constraints for the generator (style, audience, prior knowledge…)."
              className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5 text-sm text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
            />
            <p className="text-[10px] text-m3-on-surface-variant text-right">
              {form.extra_instructions.length}/1000
            </p>
          </div>

          {isCoverageMode && (
            <CoverageOptionsForm
              minPerSection={form.coverage_min_per_section}
              maxPerSection={form.coverage_max_per_section}
              skipSummaries={form.skip_summaries}
              slidesPerSection={form.slides_per_section}
              sectionGrouping={form.section_grouping}
              onChange={patchForm}
            />
          )}

          <BloomDistributionInput
            enabled={form.bloom_enabled}
            distribution={form.bloom_distribution}
            questionCount={form.question_count}
            overflow={bloomOverflow}
            onToggle={(enabled) =>
              setForm((current) => ({ ...current, bloom_enabled: enabled }))
            }
            onChange={(distribution) =>
              setForm((current) => ({
                ...current,
                bloom_distribution: distribution,
              }))
            }
          />
        </div>
      )}

      {/* ── Mode help blurb ── */}
      <div className="rounded-xl bg-m3-secondary-fixed/20 border border-m3-secondary/10 p-3 flex gap-2 text-xs text-m3-on-surface-variant">
        <Sparkles className="h-4 w-4 text-m3-secondary shrink-0 mt-0.5" />
        <p>
          {isCoverageMode
            ? "Coverage mode allocates questions per section so every chunk of the lesson gets representation."
            : "Topic mode picks a balanced spread across the selected lessons. Switch to coverage mode for full lesson breadth."}
        </p>
      </div>

      {/* ── Live run status: stage stepper + stepped % + elapsed + logs ── */}
      {displayRun && <GenerationProgress run={displayRun} />}

      <Button
        type="submit"
        disabled={
          generationInProgress ||
          selectedLessonIds.length === 0 ||
          bloomOverflow
        }
        className="w-full gap-2 gradient-primary text-white border-0 shadow-ai-glow"
      >
        {generationInProgress ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {generationInProgress ? "Generating…" : "Generate questions"}
      </Button>
    </form>
  );
}
