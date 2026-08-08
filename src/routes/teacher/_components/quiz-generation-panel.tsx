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
 *
 * State, polling and payload construction live in
 * `./quiz-generation-panel/`; this file is the composition shell.
 */

import { ChevronDown, ChevronRight } from "lucide-react";

import { CoverageSectionPicker } from "./quiz-generation-form-controls";
import { AdvancedPersonalisation } from "./quiz-generation-panel/AdvancedPersonalisation";
import { GenerationPanelFooter } from "./quiz-generation-panel/GenerationPanelFooter";
import { GenerationSettingsColumn } from "./quiz-generation-panel/GenerationSettingsColumn";
import { SourceLessonsPicker } from "./quiz-generation-panel/SourceLessonsPicker";
import { TargetOutcomesPicker } from "./quiz-generation-panel/TargetOutcomesPicker";
import { Button } from "@/components/ui/button";
import {
  useQuizGenerationPanel,
  type QuizGenerationPanelProps,
} from "./quiz-generation-panel/use-quiz-generation-panel";

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
export function QuizGenerationPanel(props: QuizGenerationPanelProps) {
  const { courseId } = props;
  const controller = useQuizGenerationPanel(props);
  const {
    t,
    lessons,
    outcomes,
    childrenByParent,
    form,
    setForm,
    selectedLessonIds,
    setSelectedLessonIds,
    showAdvanced,
    setShowAdvanced,
    isCoverageMode,
    toggleLesson,
    setSelectedSectionIds,
    toggleOutcome,
    handleGenerate,
  } = controller;

  return (
    <form onSubmit={handleGenerate} className="space-y-4">
      {/* Two-column layout on large screens so the config isn't one very long
          vertical scroll. Left = what to pull from (lessons + outcomes); right
          = how to generate (count, difficulty, types, mode, append). Wide/
          complex sections (coverage picker, advanced, progress) stay full width
          below the grid. */}
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6 items-start">
        {/* ── Left column ── */}
        <div className="space-y-4">
          <SourceLessonsPicker
            lessons={lessons}
            selectedLessonIds={selectedLessonIds}
            onToggleLesson={toggleLesson}
            onSelectAll={() => setSelectedLessonIds(lessons.map((l) => l.id))}
          />

          {courseId && (
            <TargetOutcomesPicker
              outcomes={outcomes}
              childrenByParent={childrenByParent}
              selectedOutcomeIds={form.target_outcome_ids}
              onToggleOutcome={toggleOutcome}
              onSelectAll={() =>
                setForm((current) => ({
                  ...current,
                  target_outcome_ids: outcomes.map((o) => o.id),
                }))
              }
              t={t}
            />
          )}
        </div>
        {/* ── Right column ── */}
        <GenerationSettingsColumn controller={controller} />
      </div>
      {/* ── Full-width sections below the two-column grid ── */}

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

      <Button variant="ghost"
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
      </Button>

      {showAdvanced && <AdvancedPersonalisation controller={controller} />}

      <GenerationPanelFooter controller={controller} />
    </form>
  );
}
