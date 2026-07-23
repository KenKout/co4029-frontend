import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  CheckCircle2,
  CircleHelp,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Save,
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
  DropdownMenuSeparator,
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

type OutcomeType = InterviewOutcomeAuthoring["outcome_type"];

const OUTCOME_TYPES: OutcomeType[] = ["knowledge", "skill", "attitude"];

// Editable quick templates. The label + prefilled statement are translated
// (outcomes.templates.*); type/weight are sensible starting points the teacher
// can still change before saving. Clicking a template opens the inline editor
// prefilled — it never adds an outcome immediately.
const OUTCOME_TEMPLATES: {
  key: string;
  type: OutcomeType;
  weight: number;
}[] = [
  { key: "explain_concept", type: "knowledge", weight: 3 },
  { key: "apply_knowledge", type: "skill", weight: 4 },
  { key: "analyze_tradeoffs", type: "skill", weight: 4 },
  { key: "communicate_clearly", type: "attitude", weight: 2 },
];

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

interface EditorState {
  text: string;
  type: OutcomeType;
  weight: number;
}

const EMPTY_EDITOR: EditorState = { text: "", type: "knowledge", weight: 3 };

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
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<EditorState>(EMPTY_EDITOR);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditorState>(EMPTY_EDITOR);
  const [editDirty, setEditDirty] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] =
    useState<InterviewOutcomeAuthoring | null>(null);
  // Import-from-course picker state.
  const [importing, setImporting] = useState(false);
  const [selectedImport, setSelectedImport] = useState<Set<string>>(new Set());
  const [importBusy, setImportBusy] = useState(false);

  const addTextRef = useRef<HTMLTextAreaElement | null>(null);
  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const announce = (msg: string) => {
    if (liveRegionRef.current) liveRegionRef.current.textContent = msg;
  };

  // ── Add ──────────────────────────────────────────────────────────────────
  function openAdd(prefill?: EditorState) {
    setAddDraft(prefill ?? EMPTY_EDITOR);
    setAdding(true);
    // Focus the statement input on next paint.
    window.setTimeout(() => addTextRef.current?.focus(), 0);
  }
  function cancelAdd() {
    setAdding(false);
    setAddDraft(EMPTY_EDITOR);
  }
  async function submitAdd() {
    if (!addDraft.text.trim()) return;
    try {
      await createOutcome.mutateAsync({
        position: sorted.length + 1,
        outcome_text: addDraft.text.trim(),
        outcome_type: addDraft.type,
        importance_weight: addDraft.weight,
      });
      announce(t("teacher_interview_config.outcomes.added"));
      toast.success(t("teacher_interview_config.outcomes.added"));
      cancelAdd();
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  }

  function pickTemplate(tpl: (typeof OUTCOME_TEMPLATES)[number]) {
    openAdd({
      text: t(`teacher_interview_config.outcomes.templates.${tpl.key}`),
      type: tpl.type,
      weight: tpl.weight,
    });
  }

  // ── Import from course-level outcomes ──────────────────────────────────────
  // Course outcomes carry only text; interview outcomes also need a type +
  // weight, so imported rows get sensible defaults (knowledge / weight 3) the
  // teacher can edit afterwards. Already-imported outcomes are hidden from the
  // picker by comparing normalized text (course outcomes have no interview id).
  const existingTexts = useMemo(
    () =>
      new Set(sorted.map((o) => o.outcome_text.trim().toLowerCase())),
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
    const chosen = importableOutcomes.filter((co) =>
      selectedImport.has(co.id),
    );
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

  // ── Edit ──────────────────────────────────────────────────────────────────
  function beginEdit(o: InterviewOutcomeAuthoring) {
    setEditingId(o.id);
    setEditDraft({
      text: o.outcome_text,
      type: o.outcome_type,
      weight: o.importance_weight,
    });
    setEditDirty(false);
  }
  function cancelEdit() {
    if (
      editDirty &&
      !window.confirm(t("teacher_interview_config.qbank.unsaved_confirm"))
    )
      return;
    setEditingId(null);
    setEditDirty(false);
  }
  async function saveEdit() {
    if (!editingId || !editDraft.text.trim()) return;
    setSavingId(editingId);
    try {
      await updateOutcome.mutateAsync({
        outcomeId: editingId,
        patch: {
          outcome_text: editDraft.text.trim(),
          outcome_type: editDraft.type,
          importance_weight: editDraft.weight,
        },
      });
      toast.success(t("teacher_interview_config.outcomes.saved"));
      setEditingId(null);
      setEditDirty(false);
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

  // ── Reorder (position swap through a temp parking slot; same pattern as
  // questions — the (config_id, position) unique constraint + per-PATCH
  // commit means a direct A↔B swap collides). ────────────────────────────────
  async function handleReorder(index: number, direction: -1 | 1) {
    if (reordering) return;
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    const current = sorted[index];
    const neighbour = sorted[target];
    const currentPos = current.position ?? index + 1;
    const neighbourPos = neighbour.position ?? target + 1;
    if (currentPos === neighbourPos) return;
    const tempPos = Math.max(...sorted.map((o, i) => o.position ?? i + 1)) + 1;
    setReordering(true);
    try {
      await updateOutcome.mutateAsync({
        outcomeId: current.id,
        patch: { position: tempPos },
      });
      await updateOutcome.mutateAsync({
        outcomeId: neighbour.id,
        patch: { position: currentPos },
      });
      await updateOutcome.mutateAsync({
        outcomeId: current.id,
        patch: { position: neighbourPos },
      });
      announce(
        t("teacher_interview_config.outcomes.sr_moved", { position: target + 1 }),
      );
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setReordering(false);
    }
  }

  const hasOutcomes = sorted.length > 0;

  return (
    <div className="bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-xl p-6 lg:p-8 space-y-4 shadow-glass">
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
        {!adding && !importing && (
          <div className="flex items-center gap-2 shrink-0">
            {importableOutcomes.length > 0 && (
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
            <Button
              type="button"
              variant="outline"
              onClick={() => openAdd()}
              className="gap-2 hover:bg-primary/10 hover:border-primary/40 hover:text-primary"
            >
              <Plus className="h-4 w-4" />
              {t("teacher_interview_config.outcomes.add")}
            </Button>
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

      {/* Inline add editor — templates stay available here so a teacher who
          already has outcomes can still start from a suggested statement. */}
      {adding && (
        <div className="space-y-2">
          <TemplateRow onPick={pickTemplate} />
          <OutcomeEditor
            heading={t("teacher_interview_config.outcomes.add")}
            draft={addDraft}
            setDraft={setAddDraft}
            textRef={addTextRef}
            saving={createOutcome.isPending}
            onCancel={cancelAdd}
            onSubmit={() => void submitAdd()}
            submitLabel={t("teacher_interview_config.outcomes.add_save")}
          />
        </div>
      )}

      {/* Empty state with editable templates */}
      {!hasOutcomes ? (
        !adding && (
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
            <Button
              type="button"
              onClick={() => openAdd()}
              className="gap-2"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              {t("teacher_interview_config.outcomes.add")}
            </Button>
            <TemplateRow onPick={pickTemplate} />
          </div>
        )
      ) : (
        <ul className="space-y-2" role="list">
          {sorted.map((o, idx) => {
            const count = questionCountByOutcome.get(o.id) ?? 0;
            const cov = coverageOf(count);
            const isEditing = editingId === o.id;
            return (
              <li
                key={o.id}
                aria-expanded={isEditing}
                className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low overflow-hidden"
              >
                {isEditing ? (
                  <div className="p-3">
                    <OutcomeEditor
                      heading={`LO${idx + 1}`}
                      draft={editDraft}
                      setDraft={(next) => {
                        setEditDraft(next);
                        setEditDirty(true);
                      }}
                      saving={savingId === o.id}
                      onCancel={cancelEdit}
                      onSubmit={() => void saveEdit()}
                      submitLabel={t("common.save")}
                    />
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 p-3">
                    {/* Number + reorder */}
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                      <span
                        className="inline-flex items-center rounded-full bg-m3-primary-fixed px-2 py-0.5 text-[11px] font-extrabold text-m3-primary"
                        aria-hidden="true"
                      >
                        LO{idx + 1}
                      </span>
                      <div className="flex flex-col">
                        <button
                          type="button"
                          aria-label={t("teacher_interview_config.questions.move_up")}
                          title={t("teacher_interview_config.questions.move_up")}
                          disabled={reordering || idx === 0}
                          onClick={() => void handleReorder(idx, -1)}
                          className="text-m3-on-surface-variant hover:text-m3-primary disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={t("teacher_interview_config.questions.move_down")}
                          title={t("teacher_interview_config.questions.move_down")}
                          disabled={reordering || idx === sorted.length - 1}
                          onClick={() => void handleReorder(idx, 1)}
                          className="text-m3-on-surface-variant hover:text-m3-primary disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Statement + metadata */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="text-sm text-m3-on-surface leading-relaxed">
                        {o.outcome_text}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-m3-on-surface-variant">
                        <CoverageChip coverage={cov} count={count} />
                        <Dot />
                        <span>
                          {t(`teacher_interview_config.outcomes.type_${o.outcome_type}`)}
                        </span>
                        <Dot />
                        <span>
                          {t("teacher_interview_config.outcomes.weight_badge", {
                            weight: o.importance_weight,
                          })}
                        </span>
                      </div>
                    </div>

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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => beginEdit(o)}
                        className="gap-1.5 hidden sm:inline-flex"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {t("common.edit")}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={t("teacher_interview_config.qbank.more_actions")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-m3-on-surface-variant hover:bg-surface-muted hover:text-m3-on-surface cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => onViewQuestions(o.id)}
                            className="gap-2 sm:hidden"
                          >
                            {t("teacher_interview_config.outcomes.view_questions")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => beginEdit(o)}
                            className="gap-2 sm:hidden"
                          >
                            <Pencil className="h-4 w-4" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => void handleReorder(idx, -1)}
                            disabled={reordering || idx === 0}
                            className="gap-2"
                          >
                            <ArrowUp className="h-4 w-4" />
                            {t("teacher_interview_config.questions.move_up")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => void handleReorder(idx, 1)}
                            disabled={reordering || idx === sorted.length - 1}
                            className="gap-2"
                          >
                            <ArrowDown className="h-4 w-4" />
                            {t("teacher_interview_config.questions.move_down")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setConfirmDelete(o)}
                            className="gap-2 text-red-700 focus:text-red-700 focus:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}
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
    </div>
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
        <BookOpen className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
        <div className="space-y-0.5">
          <p className="text-sm font-bold text-m3-on-surface">
            {t("teacher_interview_config.outcomes.import_title")}
          </p>
          <p className="text-xs text-m3-on-surface-variant max-w-prose">
            {t("teacher_interview_config.outcomes.import_help")}
          </p>
        </div>
      </div>

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

// ── Editable quick templates ──────────────────────────────────────────────────

function TemplateRow({
  onPick,
}: {
  onPick: (tpl: (typeof OUTCOME_TEMPLATES)[number]) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-m3-on-surface-variant">
        {t("teacher_interview_config.outcomes.templates_hint")}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {OUTCOME_TEMPLATES.map((tpl) => (
          <button
            key={tpl.key}
            type="button"
            onClick={() => onPick(tpl)}
            className="rounded-full border border-dashed border-m3-outline-variant/40 bg-m3-surface px-2.5 py-1 text-[11px] text-m3-on-surface-variant hover:bg-primary/10 hover:border-primary/40 hover:text-primary hover:-translate-y-0.5 hover:shadow-sm active:scale-95 transition-all duration-200 cursor-pointer"
          >
            + {t(`teacher_interview_config.outcomes.template_labels.${tpl.key}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Inline outcome editor (add + edit share this) ─────────────────────────────

function OutcomeEditor({
  heading,
  draft,
  setDraft,
  textRef,
  saving,
  onCancel,
  onSubmit,
  submitLabel,
}: {
  heading: string;
  draft: EditorState;
  setDraft: (next: EditorState) => void;
  textRef?: React.RefObject<HTMLTextAreaElement | null>;
  saving: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  const { t } = useTranslation();
  const canSubmit = draft.text.trim().length > 0 && !saving;
  return (
    <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low p-3 space-y-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {heading}
      </p>
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-m3-on-surface-variant">
          {t("teacher_interview_config.outcomes.statement_label")}
        </label>
        <textarea
          ref={textRef}
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          onKeyDown={(e) => {
            // Ctrl/Cmd+Enter submits.
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
              e.preventDefault();
              onSubmit();
            }
          }}
          rows={2}
          placeholder={t("teacher_interview_config.outcomes.add_placeholder")}
          className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm placeholder:text-m3-on-surface-variant/40 resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-m3-on-surface-variant">
          <span className="sr-only sm:not-sr-only">
            {t("teacher_interview_config.outcomes.type_label")}
          </span>
          <select
            value={draft.type}
            onChange={(e) =>
              setDraft({ ...draft, type: e.target.value as OutcomeType })
            }
            aria-label={t("teacher_interview_config.outcomes.type_label")}
            className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-m3-secondary/30 cursor-pointer"
          >
            {OUTCOME_TYPES.map((tp) => (
              <option key={tp} value={tp}>
                {t(`teacher_interview_config.outcomes.type_${tp}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-m3-on-surface-variant">
          {t("teacher_interview_config.outcomes.weight_label")}
          <input
            type="number"
            min={1}
            max={5}
            value={draft.weight}
            onChange={(e) =>
              setDraft({
                ...draft,
                weight: Math.min(
                  5,
                  Math.max(1, Math.floor(Number(e.target.value)) || 1),
                ),
              })
            }
            className="w-16 rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
          />
        </label>
        <div className="flex justify-end gap-2 ml-auto">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmit}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {submitLabel}
          </Button>
        </div>
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
