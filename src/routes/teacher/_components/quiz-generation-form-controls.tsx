/**
 * Quiz generation panel — form controls (T5.14, FR-5).
 *
 * Four sub-components used by the FR-5 quiz generation panel, ported
 * verbatim from the legacy module-manage panel
 * (`git show 8671e3b:src/routes/teacher/module-manage.tsx`, lines
 * 1109–1541) with two adaptations:
 *
 * 1. `CoverageSectionPicker` now takes a `lessons: LessonPublic[]`
 *    array directly instead of the legacy
 *    `Array<CourseContentItem & { lesson: CourseContentLesson }>` —
 *    the post-W5 frontend feeds outlines per-lesson via
 *    `useModuleLessons` rather than walking module items.
 * 2. `useLessonOutline` lives at `@/lib/api/hooks/teacher-courses`
 *    instead of the legacy `use-teacher-api` location.
 *
 * Sub-components are intentionally NOT exported individually — they
 * are used only by `QuizGenerationPanel` (Stage 5b). Re-exporting them
 * would invite drift and force callers to reach past the panel into
 * its internals.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Layers,
  ListChecks,
  Loader2,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLessonOutline } from "@/lib/api/hooks/teacher-courses";
import type { LessonPublic } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Bloom's taxonomy levels accepted by the backend
 * `bloom_distribution` map. Order is the standard cognitive-progression
 * order (remember → create) and is preserved across the UI.
 */
export const BLOOM_LEVELS = [
  "remember",
  "understand",
  "apply",
  "analyze",
  "evaluate",
  "create",
] as const;

export type BloomLevel = (typeof BLOOM_LEVELS)[number];
export type BloomDistribution = Record<BloomLevel, number>;

/**
 * Initial empty bloom distribution — every level set to 0. The form
 * uses this as the seed when the user first ticks "Bloom distribution".
 */
export const EMPTY_BLOOM_DISTRIBUTION: BloomDistribution = {
  remember: 0,
  understand: 0,
  apply: 0,
  analyze: 0,
  evaluate: 0,
  create: 0,
};

/**
 * Free-form tag input for `focus_topics` and `avoid_topics`.
 *
 * Caps each topic at 200 chars, the list at 10 items. Enter or comma
 * commits a tag; Backspace on an empty input pops the last tag.
 */
export function TopicTagInput({
  label,
  hint,
  icon: Icon,
  values,
  onChange,
}: {
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const atLimit = values.length >= 10;

  function commit() {
    const trimmed = draft.trim().slice(0, 200);
    if (!trimmed) {
      setDraft("");
      return;
    }
    if (values.includes(trimmed)) {
      setDraft("");
      return;
    }
    if (atLimit) return;
    onChange([...values, trimmed]);
    setDraft("");
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-2 py-2">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-lg bg-m3-secondary-fixed/40 px-2 py-1 text-xs font-semibold text-m3-secondary"
          >
            {value}
            <Button variant="ghost"
              type="button"
              onClick={() =>
                onChange(values.filter((entry) => entry !== value))
              }
              className="text-m3-secondary hover:text-m3-primary cursor-pointer"
              aria-label={t("quiz_generation.controls.remove_topic", { value })}
            >
              <X className="h-3 w-3" />
            </Button>
          </span>
        ))}
        <Input
          variant="bare"
          value={draft}
          maxLength={200}
          disabled={atLimit}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            }
            if (
              e.key === "Backspace" &&
              draft.length === 0 &&
              values.length > 0
            ) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={commit}
          placeholder={
            atLimit
              ? t("quiz_generation.controls.limit_reached")
              : t("quiz_generation.controls.topic_placeholder")
          }
          className="min-w-[140px] flex-1"
        />
      </div>
      <p className="text-[10px] text-m3-on-surface-variant">
        {hint} ({values.length}/10)
      </p>
    </div>
  );
}

/**
 * Coverage-mode tuning knobs — min/max questions per section, the
 * slide-deck fallback group size, and the skip-summary toggle.
 *
 * Patches are emitted with the exact field names the backend's
 * `CoverageOptions` schema expects (snake_case), so the parent panel
 * can spread them into its form state without translation.
 */
export type CoverageOptionsPatch = Partial<{
  coverage_min_per_section: number;
  coverage_max_per_section: number;
  skip_summaries: boolean;
  slides_per_section: number;
  section_grouping: "auto" | "fixed";
}>;

export function CoverageOptionsForm({
  minPerSection,
  maxPerSection,
  skipSummaries,
  slidesPerSection,
  sectionGrouping,
  onChange,
}: {
  minPerSection: number;
  maxPerSection: number;
  skipSummaries: boolean;
  slidesPerSection: number;
  sectionGrouping: "auto" | "fixed";
  onChange: (patch: CoverageOptionsPatch) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3 rounded-xl border border-m3-secondary/20 bg-m3-secondary-fixed/10 p-3">
      <div className="flex items-center gap-1.5">
        <Layers className="h-3.5 w-3.5 text-m3-secondary" />
        <p className="text-xs font-bold uppercase tracking-widest text-m3-secondary">
          {t("quiz_generation.controls.coverage_options")}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("quiz_generation.controls.min_per_section")}
          </label>
          <Input
            type="number"
            min={0}
            max={10}
            value={minPerSection}
            onChange={(e) =>
              onChange({
                coverage_min_per_section: Math.max(
                  0,
                  Math.min(10, Number(e.target.value) || 0),
                ),
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("quiz_generation.controls.max_per_section")}
          </label>
          <Input
            type="number"
            min={1}
            max={10}
            value={maxPerSection}
            onChange={(e) =>
              onChange({
                coverage_max_per_section: Math.max(
                  1,
                  Math.min(10, Number(e.target.value) || 1),
                ),
              })
            }
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("quiz_generation.controls.section_grouping")}
        </label>
        <Select<"auto" | "fixed">
          aria-label={t("quiz_generation.controls.section_grouping")}
          value={sectionGrouping}
          onValueChange={(next) => onChange({ section_grouping: next })}
          options={[
            {
              value: "fixed",
              label: t("quiz_generation.controls.grouping_fixed"),
            },
            {
              value: "auto",
              label: t("quiz_generation.controls.grouping_auto"),
            },
          ]}
        />
        <p className="text-[10px] text-m3-on-surface-variant">
          {t("quiz_generation.controls.grouping_help")}
        </p>
      </div>
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("quiz_generation.controls.slides_per_section")}
        </label>
        <Input
          type="number"
          min={1}
          max={20}
          value={slidesPerSection}
          onChange={(e) =>
            onChange({
              slides_per_section: Math.max(
                1,
                Math.min(20, Number(e.target.value) || 1),
              ),
            })
          }
        />
        <p className="text-[10px] text-m3-on-surface-variant">
          {t("quiz_generation.controls.slides_per_section_help")}
        </p>
      </div>
      <label className="flex items-start gap-2 cursor-pointer">
        <Checkbox
          checked={skipSummaries}
          onCheckedChange={(checked) => onChange({ skip_summaries: checked })}
          className="mt-0.5"
        />
        <span className="text-xs text-m3-on-surface">
          {t("quiz_generation.controls.skip_summaries")}
          <span className="block text-[10px] text-m3-on-surface-variant">
            {t("quiz_generation.controls.skip_summaries_hint")}
          </span>
        </span>
      </label>
    </div>
  );
}

/**
 * Per-lesson outline picker. Fetches the live outline via
 * `useLessonOutline` and lets the user check off individual sections.
 * Empty selection = include all sections (the backend's default).
 *
 * "Apply suggested" pipes the lesson's `suggested_question_count` back
 * to the parent so the user can quickly match the number of questions
 * to the available section budget.
 */
function LessonOutlineSection({
  lessonId,
  fallbackTitle,
  selectedSectionIds,
  slidesPerSection,
  sectionGrouping,
  onSectionsChange,
  onSuggestQuestionCount,
}: {
  lessonId: string;
  fallbackTitle: string;
  selectedSectionIds: string[];
  slidesPerSection: number;
  sectionGrouping: "auto" | "fixed";
  onSectionsChange: (sectionIds: string[]) => void;
  onSuggestQuestionCount: (count: number) => void;
}) {
  const { t } = useTranslation();
  const {
    data: outline,
    isLoading,
    error,
  } = useLessonOutline(lessonId, {
    slidesPerSection,
    sectionGrouping,
  });
  const [expanded, setExpanded] = useState(true);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-xs text-m3-on-surface-variant flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        {t("quiz_generation.controls.loading_outline", {
          title: fallbackTitle,
        })}
      </div>
    );
  }

  if (error || !outline) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 flex items-start gap-2">
        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          {t("quiz_generation.controls.outline_failed", {
            title: fallbackTitle,
          })}
        </span>
      </div>
    );
  }

  function toggleSection(sectionId: string) {
    if (selectedSectionIds.includes(sectionId)) {
      onSectionsChange(selectedSectionIds.filter((id) => id !== sectionId));
    } else {
      onSectionsChange([...selectedSectionIds, sectionId]);
    }
  }

  return (
    <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface overflow-hidden">
      <Button variant="ghost"
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-m3-surface-container-low cursor-pointer h-auto whitespace-normal"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-m3-on-surface-variant" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-m3-on-surface-variant" />
        )}
        <span className="flex-1 text-sm font-semibold text-m3-on-surface truncate">
          {outline.lesson_title}
        </span>
        <span className="text-[10px] text-m3-on-surface-variant">
          {t("quiz_generation.controls.section_count", {
            count: outline.sections.length,
          })}
        </span>
        <span className="text-[10px] font-semibold text-m3-secondary">
          {t("quiz_generation.controls.suggested", {
            count: outline.suggested_question_count,
          })}
        </span>
      </Button>

      {expanded && (
        <div className="border-t border-m3-outline-variant/20 p-2 space-y-1">
          <div className="flex items-center justify-between gap-2 px-1 pb-1">
            <span className="text-[10px] text-m3-on-surface-variant">
              {t("quiz_generation.controls.full_coverage_min", {
                count: outline.min_for_full_coverage,
              })}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost"
                type="button"
                onClick={() =>
                  onSuggestQuestionCount(outline.suggested_question_count)
                }
                className="text-[10px] font-semibold text-m3-secondary hover:text-m3-primary cursor-pointer"
              >
                {t("quiz_generation.controls.apply_suggested")}
              </Button>
              <Button variant="ghost"
                type="button"
                onClick={() => onSectionsChange([])}
                disabled={selectedSectionIds.length === 0}
                className="text-[10px] font-semibold text-m3-on-surface-variant hover:text-m3-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {t("common.data_table.clear")}
              </Button>
            </div>
          </div>
          {outline.sections.map((section) => {
            const checked = selectedSectionIds.includes(section.id);
            return (
              <label
                key={section.id}
                className={cn(
                  "flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs cursor-pointer",
                  checked
                    ? "bg-m3-secondary-fixed/30"
                    : "hover:bg-m3-surface-container-low",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleSection(section.id)}
                  className="mt-0.5 h-3.5 w-3.5"
                />
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-m3-on-surface truncate">
                    {section.title}
                  </span>
                  <span className="block text-[10px] text-m3-on-surface-variant">
                    {t("quiz_generation.controls.chunk_pages", {
                      count: section.chunk_count,
                      from: section.page_range[0],
                      to: section.page_range[1],
                    })}{" "}
                    <span className="capitalize">{section.content_role}</span>
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Coverage-mode section picker. Renders one
 * {@link LessonOutlineSection} per visible lesson.
 *
 * `lessons` is the full list of candidate lessons (from
 * `useModuleLessons` in quiz-manage); `selectedLessonIds` filters that
 * list down to the lessons the user has ticked on the source picker.
 * If the filter empties the list, render an inline hint instead of
 * collapsing silently — the user has likely deselected everything.
 */
export function CoverageSectionPicker({
  lessons,
  selectedLessonIds,
  selectedSectionIds,
  slidesPerSection,
  sectionGrouping,
  onSectionsChange,
  onSuggestQuestionCount,
}: {
  lessons: LessonPublic[];
  selectedLessonIds: string[];
  selectedSectionIds: Record<string, string[]>;
  slidesPerSection: number;
  sectionGrouping: "auto" | "fixed";
  onSectionsChange: (lessonId: string, sectionIds: string[]) => void;
  onSuggestQuestionCount: (count: number) => void;
}) {
  const { t } = useTranslation();
  const visibleLessons = lessons.filter((lesson) =>
    selectedLessonIds.includes(lesson.id),
  );

  if (visibleLessons.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-m3-outline-variant/30 bg-m3-surface px-4 py-3 text-xs text-m3-on-surface-variant">
        {t("quiz_generation.controls.select_lesson_hint")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5" />
          {t("quiz_generation.controls.sections_to_cover")}
        </label>
        <span className="text-[10px] text-m3-on-surface-variant">
          {t("quiz_generation.controls.empty_includes_all")}
        </span>
      </div>
      <div className="space-y-2">
        {visibleLessons.map((lesson) => (
          <LessonOutlineSection
            key={lesson.id}
            lessonId={lesson.id}
            fallbackTitle={lesson.title}
            selectedSectionIds={selectedSectionIds[lesson.id] ?? []}
            slidesPerSection={slidesPerSection}
            sectionGrouping={sectionGrouping}
            onSectionsChange={(ids) => onSectionsChange(lesson.id, ids)}
            onSuggestQuestionCount={onSuggestQuestionCount}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Bloom distribution input — a 6-cell grid of integer inputs, one per
 * level. Total must not exceed `questionCount`; `overflow` is computed
 * by the parent and toggles the warning style.
 *
 * Levels left at 0 are passed through to the backend, which interprets
 * them as "let the generator decide".
 */
export function BloomDistributionInput({
  enabled,
  distribution,
  questionCount,
  overflow,
  onToggle,
  onChange,
}: {
  enabled: boolean;
  distribution: BloomDistribution;
  questionCount: number;
  overflow: boolean;
  onToggle: (enabled: boolean) => void;
  onChange: (distribution: BloomDistribution) => void;
}) {
  const { t } = useTranslation();
  const total = Object.values(distribution).reduce(
    (sum, value) => sum + value,
    0,
  );

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox checked={enabled} onCheckedChange={onToggle} />
        <span className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("quiz_generation.controls.bloom_distribution")}
        </span>
      </label>
      {enabled && (
        <div className="space-y-2 rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BLOOM_LEVELS.map((level) => (
              <div key={level} className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-m3-on-surface-variant">
                  {t(`quiz_generation.bloom.${level}`)}
                </label>
                <Input
                  type="number"
                  min={0}
                  max={questionCount}
                  value={distribution[level]}
                  onChange={(e) => {
                    const next = Math.max(
                      0,
                      Math.min(questionCount, Number(e.target.value) || 0),
                    );
                    onChange({ ...distribution, [level]: next });
                  }}
                />
              </div>
            ))}
          </div>
          <p
            className={cn(
              "text-[11px]",
              overflow
                ? "text-red-600 font-semibold"
                : "text-m3-on-surface-variant",
            )}
          >
            {t("quiz_generation.controls.total", { total, questionCount })}
            {overflow && t("quiz_generation.controls.exceeds_count")}
          </p>
          <p className="text-[10px] text-m3-on-surface-variant">
            {t("quiz_generation.controls.bloom_hint")}
          </p>
        </div>
      )}
    </div>
  );
}
