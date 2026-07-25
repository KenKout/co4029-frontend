import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Check,
  CheckCircle2,
  CircleHelp,
  Loader2,
  Minus,
  MoreVertical,
  Plus,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCreateInterviewOutcome,
  useDeleteInterviewOutcome,
  useUpdateInterviewOutcome,
} from "@/lib/api/hooks/interviews";
import { useTeacherCourseOutcomes } from "@/lib/api/hooks/courses";
import type {
  CourseLearningOutcomeAuthoring,
  InterviewOutcomeAuthoring,
  InterviewQuestionAuthoring,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

// Coverage thresholds (derived from question→outcome assignment counts).
//   0 questions → none, 1 → limited, 2+ → covered.
function coverageOf(count: number): "none" | "limited" | "covered" {
  if (count <= 0) return "none";
  if (count === 1) return "limited";
  return "covered";
}

interface LearningOutcomesProps {
  configId: string;
  /** Parent course id — lets the teacher import course-level outcomes. */
  courseId: string;
  outcomes: InterviewOutcomeAuthoring[];
  questions: InterviewQuestionAuthoring[];
  /** Config-level pass threshold (min outcomes a student must satisfy). */
  minOutcomesToPass: number | null | undefined;
  /** Scroll to the Question Bank and filter it to this outcome's questions. */
  onViewQuestions: (outcomeId: string) => void;
}

export function LearningOutcomes({
  configId,
  courseId,
  outcomes,
  questions,
  minOutcomesToPass,
  onViewQuestions,
}: LearningOutcomesProps) {
  const { t } = useTranslation();
  const createOutcome = useCreateInterviewOutcome(configId);
  const updateOutcome = useUpdateInterviewOutcome(configId);
  const deleteOutcome = useDeleteInterviewOutcome(configId);
  const { data: courseOutcomes } = useTeacherCourseOutcomes(courseId);

  const sorted = useMemo(
    () => [...outcomes].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [outcomes],
  );

  // outcomeId → assigned question count (real linked_outcome_id).
  const questionCountByOutcome = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of questions) {
      if (q.linked_outcome_id) {
        map.set(q.linked_outcome_id, (map.get(q.linked_outcome_id) ?? 0) + 1);
      }
    }
    return map;
  }, [questions]);

  const coveredCount = useMemo(
    () =>
      sorted.filter((o) => (questionCountByOutcome.get(o.id) ?? 0) >= 1).length,
    [sorted, questionCountByOutcome],
  );
  const uncoveredCount = sorted.length - coveredCount;
  const totalAssigned = useMemo(
    () => questions.filter((q) => q.linked_outcome_id).length,
    [questions],
  );

  // ── Local UI state ──────────────────────────────────────────────────────
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] =
    useState<InterviewOutcomeAuthoring | null>(null);
  // Import-from-course picker state.
  const [importing, setImporting] = useState(false);
  const [selectedImport, setSelectedImport] = useState<Set<string>>(new Set());
  const [importBusy, setImportBusy] = useState(false);

  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const announce = (msg: string) => {
    if (liveRegionRef.current) liveRegionRef.current.textContent = msg;
  };

  // ── Import from course-level outcomes ──────────────────────────────────────
  // Course outcomes carry only text; interview outcomes also need a type +
  // weight, so imported rows get sensible defaults (knowledge / weight 3) the
  // teacher can edit afterwards. Already-imported outcomes are hidden from the
  // picker by comparing normalized text (course outcomes have no interview id).
  const existingTexts = useMemo(
    () => new Set(sorted.map((o) => o.outcome_text.trim().toLowerCase())),
    [sorted],
  );
  const importableOutcomes = useMemo(
    () =>
      (courseOutcomes ?? []).filter(
        (co) => !existingTexts.has(co.outcome_text.trim().toLowerCase()),
      ),
    [courseOutcomes, existingTexts],
  );

  function openImport() {
    setSelectedImport(new Set());
    setImporting(true);
  }
  function toggleImportSelection(id: string) {
    setSelectedImport((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  async function submitImport() {
    const chosen = importableOutcomes.filter((co) => selectedImport.has(co.id));
    if (chosen.length === 0) return;
    setImportBusy(true);
    let created = 0;
    try {
      // Sequential creates: the (config_id, position) unique constraint means
      // parallel POSTs at the same position would collide.
      let position = sorted.length;
      for (const co of chosen) {
        position += 1;
        await createOutcome.mutateAsync({
          position,
          outcome_text: co.outcome_text.trim(),
          outcome_type: "knowledge",
          importance_weight: 3,
        });
        created += 1;
      }
      announce(
        t("teacher_interview_config.outcomes.imported", { count: created }),
      );
      toast.success(
        t("teacher_interview_config.outcomes.imported", { count: created }),
      );
      setImporting(false);
      setSelectedImport(new Set());
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setImportBusy(false);
    }
  }

  // ── Weight (the only inline-editable field) ────────────────────────────────
  // Outcome text/type are owned by the course-level outcome and imported
  // verbatim, so they are read-only here. The importance weight is
  // interview-specific, so it gets a stepper that PATCHes immediately —
  // no edit mode, no separate save button.
  async function setWeight(o: InterviewOutcomeAuthoring, next: number) {
    const clamped = Math.min(5, Math.max(1, Math.round(next)));
    if (clamped === o.importance_weight) return;
    setSavingId(o.id);
    try {
      await updateOutcome.mutateAsync({
        outcomeId: o.id,
        patch: { importance_weight: clamped },
      });
      announce(
        t("teacher_interview_config.outcomes.weight_badge", {
          weight: clamped,
        }),
      );
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function doDelete(o: InterviewOutcomeAuthoring) {
    try {
      await deleteOutcome.mutateAsync(o.id);
      announce(t("teacher_interview_config.outcomes.deleted"));
      toast.success(t("teacher_interview_config.outcomes.deleted"));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setConfirmDelete(null);
    }
  }

  const hasOutcomes = sorted.length > 0;

  return (
    <section className="rounded-xl border border-m3-outline-variant/40 bg-m3-surface-container-low/40 p-5 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 space-y-1">
          <h3 className="font-headline font-extrabold text-base text-m3-on-surface">
            {t("teacher_interview_config.outcomes.list_title")}
          </h3>
          <p className="text-xs text-m3-on-surface-variant max-w-prose">
            {t("teacher_interview_config.outcomes.section_help")}
          </p>
        </div>
        {hasOutcomes && !importing && (
          <div className="flex items-center gap-2 shrink-0">
            {(courseOutcomes?.length ?? 0) > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={openImport}
                className="gap-2 hover:bg-primary/10 hover:border-primary/40 hover:text-primary"
              >
                <BookOpen className="h-4 w-4" />
                {t("teacher_interview_config.outcomes.import_from_course")}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Import-from-course picker: multi-select the course-level outcomes to
          copy in. Already-imported ones are filtered out upstream. */}
      {importing && (
        <ImportFromCoursePanel
          outcomes={importableOutcomes}
          selected={selectedImport}
          onToggle={toggleImportSelection}
          busy={importBusy}
          onCancel={() => setImporting(false)}
          onConfirm={() => void submitImport()}
        />
      )}

      {/* Status summary (real, derived counts) */}
      {hasOutcomes && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-m3-on-surface-variant">
          <span className="inline-flex items-center gap-1 font-semibold text-m3-on-surface">
            {t("teacher_interview_config.outcomes.summary_outcomes", {
              count: sorted.length,
            })}
          </span>
          <Dot />
          <span>
            {t("teacher_interview_config.outcomes.summary_assigned", {
              count: totalAssigned,
            })}
          </span>
          <Dot />
          {uncoveredCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
              <TriangleAlert className="h-3 w-3" aria-hidden="true" />
              {t("teacher_interview_config.outcomes.summary_uncovered", {
                count: uncoveredCount,
              })}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              {t("teacher_interview_config.outcomes.summary_all_covered")}
            </span>
          )}
          <Dot />
          <span className="inline-flex items-center gap-1">
            {t("teacher_interview_config.outcomes.required_for_publishing")}
          </span>
        </div>
      )}

      {/* Coverage + pass-threshold explainer */}
      {hasOutcomes && (
        <div className="rounded-lg border border-m3-outline-variant/20 bg-m3-surface-container-low px-3 py-2 space-y-1">
          <p className="text-[11px] text-m3-on-surface-variant">
            <span className="font-semibold text-m3-on-surface">
              {t("teacher_interview_config.outcomes.coverage_title")}
            </span>{" "}
            {t("teacher_interview_config.outcomes.coverage_summary", {
              covered: coveredCount,
              total: sorted.length,
            })}
          </p>
          {typeof minOutcomesToPass === "number" && minOutcomesToPass > 0 && (
            <p className="text-[11px] text-m3-on-surface-variant inline-flex items-center gap-1">
              <CircleHelp className="h-3 w-3 shrink-0" aria-hidden="true" />
              {t("teacher_interview_config.outcomes.pass_threshold", {
                required: minOutcomesToPass,
                total: sorted.length,
              })}
            </p>
          )}
        </div>
      )}

      {/* Empty state — outcomes are sourced from the course, never authored
          here, so the only affordance is the course importer. */}
      {!hasOutcomes ? (
        !importing && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <TriangleAlert
                className="h-4 w-4 text-amber-600 mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <p className="text-sm font-bold text-m3-on-surface">
                  {t("teacher_interview_config.outcomes.empty_title")}
                </p>
                <p className="text-xs text-m3-on-surface-variant max-w-prose">
                  {t("teacher_interview_config.outcomes.empty_body")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {importableOutcomes.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={openImport}
                  className="gap-2 hover:bg-primary/10 hover:border-primary/40 hover:text-primary"
                  size="sm"
                >
                  <BookOpen className="h-4 w-4" />
                  {t("teacher_interview_config.outcomes.import_from_course")}
                </Button>
              ) : (
                <p className="text-xs text-m3-on-surface-variant">
                  {t("teacher_interview_config.outcomes.no_course_outcomes")}
                </p>
              )}
            </div>
          </div>
        )
      ) : (
        <ul className="space-y-2" role="list">
          {sorted.map((o, idx) => {
            const count = questionCountByOutcome.get(o.id) ?? 0;
            const cov = coverageOf(count);
            return (
              <li
                key={o.id}
                className="group rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low overflow-hidden transition-colors hover:border-m3-primary/30"
              >
                <div className="flex items-start gap-2.5 p-3">
                  {/* Index badge only — outcomes mirror the course order, so
                      there is no per-row reordering here. */}
                  <span
                    className="mt-0.5 inline-flex shrink-0 items-center rounded-full bg-m3-primary-fixed px-2 py-0.5 text-[11px] font-extrabold text-m3-primary"
                    aria-hidden="true"
                  >
                    LO{idx + 1}
                  </span>

                  {/* Statement + metadata (read-only: the text is owned by the
                      course-level outcome and imported, never edited here). */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-sm text-m3-on-surface leading-relaxed">
                      {o.outcome_text}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-m3-on-surface-variant">
                      <CoverageChip coverage={cov} count={count} />
                      <Dot />
                      <span>
                        {t(
                          `teacher_interview_config.outcomes.type_${o.outcome_type}`,
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Weight stepper — the one inline-editable knob, saved
                      immediately (no edit mode / no save button). */}
                  <WeightStepper
                    weight={o.importance_weight}
                    busy={savingId === o.id}
                    onChange={(next) => void setWeight(o, next)}
                  />

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewQuestions(o.id)}
                      className="gap-1.5 hidden sm:inline-flex text-xs"
                    >
                      {t("teacher_interview_config.outcomes.view_questions")}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={t(
                          "teacher_interview_config.qbank.more_actions",
                        )}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-m3-on-surface-variant hover:bg-surface-muted hover:text-m3-on-surface cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => onViewQuestions(o.id)}
                          className="gap-2 sm:hidden"
                        >
                          {t(
                            "teacher_interview_config.outcomes.view_questions",
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setConfirmDelete(o)}
                          className="gap-2 text-red-700 focus:text-red-700 focus:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          {t("teacher_interview_config.outcomes.remove")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Delete confirmation (surfaces real assigned-question count) */}
      {confirmDelete && (
        <DeleteConfirm
          outcome={confirmDelete}
          assignedCount={questionCountByOutcome.get(confirmDelete.id) ?? 0}
          pending={deleteOutcome.isPending}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => void doDelete(confirmDelete)}
        />
      )}

      <div ref={liveRegionRef} aria-live="polite" className="sr-only" />
    </section>
  );
}

// ── Import-from-course picker ─────────────────────────────────────────────────

function ImportFromCoursePanel({
  outcomes,
  selected,
  onToggle,
  busy,
  onCancel,
  onConfirm,
}: {
  outcomes: CourseLearningOutcomeAuthoring[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const count = selected.size;
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <BookOpen
          className="h-4 w-4 text-primary mt-0.5 shrink-0"
          aria-hidden="true"
        />
        <div className="space-y-0.5">
          <p className="text-sm font-bold text-m3-on-surface">
            {t("teacher_interview_config.outcomes.import_title")}
          </p>
          <p className="text-xs text-m3-on-surface-variant max-w-prose">
            {t("teacher_interview_config.outcomes.import_help")}
          </p>
        </div>
      </div>

      {outcomes.length === 0 && (
        <p className="rounded-lg border border-m3-outline-variant/30 bg-m3-surface px-3 py-2 text-xs text-m3-on-surface-variant">
          {t("teacher_interview_config.outcomes.import_all_added")}
        </p>
      )}

      <ul className="space-y-1.5 max-h-64 overflow-y-auto">
        {outcomes.map((co, idx) => {
          const isSel = selected.has(co.id);
          return (
            <li key={co.id}>
              <button
                type="button"
                onClick={() => onToggle(co.id)}
                aria-pressed={isSel}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                  isSel
                    ? "border-primary bg-primary/10"
                    : "border-m3-outline-variant/30 bg-m3-surface hover:bg-m3-surface-container-low",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                    isSel
                      ? "border-primary bg-primary text-white"
                      : "border-m3-outline-variant",
                  )}
                >
                  {isSel && <Check className="h-3 w-3" />}
                </span>
                <span className="min-w-0 flex-1 space-y-0.5">
                  <span className="inline-flex items-center rounded-full bg-m3-primary-fixed px-1.5 py-0.5 text-[10px] font-extrabold text-m3-primary mr-1.5">
                    {t("teacher_interview_config.outcomes.course_lo_code", {
                      n: co.position ?? idx + 1,
                    })}
                  </span>
                  <span className="text-sm text-m3-on-surface leading-relaxed">
                    {co.outcome_text}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          disabled={busy || count === 0}
          onClick={onConfirm}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {t("teacher_interview_config.outcomes.import_selected", { count })}
        </Button>
      </div>
    </div>
  );
}

// ── Weight stepper ────────────────────────────────────────────────────────────

/**
 * Compact −/+ stepper for an outcome's importance weight (1–5).
 *
 * Replaces the old "enter edit mode → change a number input → press Save"
 * round-trip: each click PATCHes immediately, so adjusting how much an outcome
 * counts is a single tap. Clamped to 1–5 with the ends disabled so the teacher
 * gets an affordance rather than a silent no-op.
 */
function WeightStepper({
  weight,
  busy,
  onChange,
}: {
  weight: number;
  busy: boolean;
  onChange: (next: number) => void;
}) {
  const { t } = useTranslation();
  const MIN = 1;
  const MAX = 5;
  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-m3-on-surface-variant">
        {t("teacher_interview_config.outcomes.weight_label")}
      </span>
      <div className="inline-flex items-center rounded-lg border border-m3-outline-variant/30 bg-m3-surface">
        <button
          type="button"
          aria-label={t("teacher_interview_config.outcomes.weight_decrease")}
          title={t("teacher_interview_config.outcomes.weight_decrease")}
          disabled={busy || weight <= MIN}
          onClick={() => onChange(weight - 1)}
          className="grid h-7 w-7 place-items-center rounded-l-lg text-m3-on-surface-variant transition-colors hover:bg-m3-primary/10 hover:text-m3-primary disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span
          className="min-w-9 px-1 text-center text-xs font-extrabold tabular-nums text-m3-on-surface"
          aria-live="polite"
        >
          {busy ? (
            <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" />
          ) : (
            `${weight}/${MAX}`
          )}
        </span>
        <button
          type="button"
          aria-label={t("teacher_interview_config.outcomes.weight_increase")}
          title={t("teacher_interview_config.outcomes.weight_increase")}
          disabled={busy || weight >= MAX}
          onClick={() => onChange(weight + 1)}
          className="grid h-7 w-7 place-items-center rounded-r-lg text-m3-on-surface-variant transition-colors hover:bg-m3-primary/10 hover:text-m3-primary disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Coverage chip ─────────────────────────────────────────────────────────────

function CoverageChip({
  coverage,
  count,
}: {
  coverage: "none" | "limited" | "covered";
  count: number;
}) {
  const { t } = useTranslation();
  if (coverage === "covered") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        {t("teacher_interview_config.outcomes.used_by", { count })}
      </span>
    );
  }
  if (coverage === "limited") {
    return (
      <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
        <TriangleAlert className="h-3 w-3" aria-hidden="true" />
        {t("teacher_interview_config.outcomes.limited_coverage", { count })}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
      <TriangleAlert className="h-3 w-3" aria-hidden="true" />
      {t("teacher_interview_config.outcomes.no_questions")}
    </span>
  );
}

function Dot() {
  return (
    <span aria-hidden="true" className="text-m3-on-surface-variant/40">
      ·
    </span>
  );
}

// ── Delete confirmation dialog ────────────────────────────────────────────────

function DeleteConfirm({
  outcome,
  assignedCount,
  pending,
  onCancel,
  onConfirm,
}: {
  outcome: InterviewOutcomeAuthoring;
  assignedCount: number;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-m3-surface p-6 shadow-xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
            <Trash2 className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="font-headline font-bold text-base text-m3-on-surface">
              {t("teacher_interview_config.outcomes.delete_title")}
            </h2>
            <p className="text-sm text-m3-on-surface-variant">
              {assignedCount > 0
                ? t("teacher_interview_config.outcomes.delete_used_body", {
                    count: assignedCount,
                  })
                : t("teacher_interview_config.outcomes.delete_unused_body")}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={pending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="bg-red-600 text-white hover:bg-red-700 border-0 gap-2"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {t("teacher_interview_config.outcomes.delete_confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default LearningOutcomes;
