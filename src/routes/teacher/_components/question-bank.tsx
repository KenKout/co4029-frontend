import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  CircleDot,
  FileText,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Save,
  Search,
  Target,
  Trash2,
  TriangleAlert,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCreateInterviewQuestion,
  useDeleteInterviewQuestion,
  useUpdateInterviewQuestion,
} from "@/lib/api/hooks/interviews";
import type {
  InterviewOutcomeAuthoring,
  InterviewQuestionAuthoring,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

type ReviewStatus = InterviewQuestionAuthoring["review_status"];

/**
 * The Question Bank is a review workspace over the REAL question data. Every
 * feature here reads/writes existing fields only — no fabricated metadata,
 * no backend schema changes. The unified status control maps the existing
 * `review_status` enum (pending | approved | edited | rejected) onto the
 * four teacher-facing labels (Needs review | Approved | Draft | Has issues);
 * changing status just PATCHes `review_status`, preserving the approval logic.
 */
const STATUS_ORDER: ReviewStatus[] = [
  "edited",
  "pending",
  "approved",
  "rejected",
];

function statusMeta(status: ReviewStatus): {
  key: string;
  dotClass: string;
  chipClass: string;
  Icon: typeof CircleDot;
} {
  switch (status) {
    case "approved":
      return {
        key: "approved",
        dotClass: "text-emerald-600",
        chipClass: "bg-emerald-100 text-emerald-700",
        Icon: CheckCircle2,
      };
    case "pending":
      return {
        key: "needs_review",
        dotClass: "text-amber-600",
        chipClass: "bg-amber-100 text-amber-700",
        Icon: CircleDot,
      };
    case "rejected":
      return {
        key: "has_issues",
        dotClass: "text-red-600",
        chipClass: "bg-red-100 text-red-700",
        Icon: TriangleAlert,
      };
    case "edited":
    default:
      return {
        key: "draft",
        dotClass: "text-slate-500",
        chipClass: "bg-slate-100 text-slate-600",
        Icon: CircleDashed,
      };
  }
}

function difficultyChipClass(
  difficulty: NonNullable<InterviewQuestionAuthoring["difficulty"]>,
): string {
  switch (difficulty) {
    case "senior":
      return "bg-purple-100 text-purple-700";
    case "mid_level":
      return "bg-blue-100 text-blue-700";
    case "junior":
    default:
      return "bg-teal-100 text-teal-700";
  }
}

interface QuestionBankProps {
  configId: string;
  questions: InterviewQuestionAuthoring[];
  outcomes: InterviewOutcomeAuthoring[];
  /**
   * External request to filter by a specific outcome (from the Learning
   * Outcomes "View questions" action). The `nonce` lets the same outcome be
   * re-requested; the effect re-runs whenever it changes.
   */
  outcomeFilterSignal?: { id: string | "none"; nonce: number } | null;
}

export function QuestionBank({
  configId,
  questions,
  outcomes,
  outcomeFilterSignal,
}: QuestionBankProps) {
  const { t } = useTranslation();
  const updateQuestion = useUpdateInterviewQuestion(configId);
  const deleteQuestion = useDeleteInterviewQuestion(configId);
  const createQuestion = useCreateInterviewQuestion(configId);

  // Position-ordered view; positions map to the visible "01, 02…" numbers.
  const sorted = useMemo(
    () => [...questions].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [questions],
  );

  // Outcome lookup: id → { label: "LO{n}", text } for metadata + search.
  const outcomeById = useMemo(() => {
    const sortedOutcomes = [...outcomes].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );
    const map = new Map<string, { label: string; text: string }>();
    sortedOutcomes.forEach((o, i) => {
      map.set(o.id, { label: `LO${i + 1}`, text: o.outcome_text ?? "" });
    });
    return map;
  }, [outcomes]);

  // Ordered [id, label, text] options for the edit-form outcome picker.
  const outcomeOptions = useMemo(
    () =>
      [...outcomes]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((o, i) => ({
          id: o.id,
          label: `LO${i + 1}`,
          text: o.outcome_text ?? "",
        })),
    [outcomes],
  );

  // ── Local UI state (no server state) ──────────────────────────────────────
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingAnswer, setEditingAnswer] = useState("");
  const [editDirty, setEditDirty] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [approvingAll, setApprovingAll] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "all">("all");
  const [outcomeFilter, setOutcomeFilter] = useState<string | "all" | "none">(
    "all",
  );
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "ai" | "manual">(
    "all",
  );

  // React to an external "View questions" request from Learning Outcomes:
  // clear other filters, scope to the requested outcome, and reset search so
  // the assigned questions are unambiguous.
  const lastSignalNonce = useRef<number>(-1);
  useEffect(() => {
    if (!outcomeFilterSignal) return;
    if (outcomeFilterSignal.nonce === lastSignalNonce.current) return;
    lastSignalNonce.current = outcomeFilterSignal.nonce;
    setSearch("");
    setStatusFilter("all");
    setDifficultyFilter("all");
    setTypeFilter("all");
    setSourceFilter("all");
    setOutcomeFilter(outcomeFilterSignal.id);
  }, [outcomeFilterSignal]);

  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const announce = (msg: string) => {
    if (liveRegionRef.current) liveRegionRef.current.textContent = msg;
  };

  const approvedCount = useMemo(
    () => sorted.filter((q) => q.review_status === "approved").length,
    [sorted],
  );
  const pendingQuestions = useMemo(
    () => sorted.filter((q) => q.review_status !== "approved"),
    [sorted],
  );

  // Distinct difficulties / types actually present (for filter dropdowns).
  const presentDifficulties = useMemo(
    () =>
      Array.from(
        new Set(sorted.map((q) => q.difficulty).filter(Boolean)),
      ) as NonNullable<InterviewQuestionAuthoring["difficulty"]>[],
    [sorted],
  );
  const presentTypes = useMemo(
    () => Array.from(new Set(sorted.map((q) => q.question_type))),
    [sorted],
  );

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sorted.filter((q) => {
      if (statusFilter !== "all" && q.review_status !== statusFilter)
        return false;
      if (outcomeFilter === "none" && q.linked_outcome_id) return false;
      if (
        outcomeFilter !== "all" &&
        outcomeFilter !== "none" &&
        q.linked_outcome_id !== outcomeFilter
      )
        return false;
      if (difficultyFilter !== "all" && q.difficulty !== difficultyFilter)
        return false;
      if (typeFilter !== "all" && q.question_type !== typeFilter) return false;
      if (sourceFilter === "ai" && !q.ai_generated) return false;
      if (sourceFilter === "manual" && q.ai_generated) return false;
      if (term) {
        const lo = q.linked_outcome_id
          ? outcomeById.get(q.linked_outcome_id)
          : undefined;
        const haystack = [
          q.prompt_text,
          q.model_answer ?? "",
          q.question_type,
          q.difficulty ?? "",
          lo?.label ?? "",
          lo?.text ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [
    sorted,
    search,
    statusFilter,
    outcomeFilter,
    difficultyFilter,
    typeFilter,
    sourceFilter,
    outcomeById,
  ]);

  const anyFilterActive =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    outcomeFilter !== "all" ||
    difficultyFilter !== "all" ||
    typeFilter !== "all" ||
    sourceFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setOutcomeFilter("all");
    setDifficultyFilter("all");
    setTypeFilter("all");
    setSourceFilter("all");
  }

  // ── Expand / collapse ──────────────────────────────────────────────────────
  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function collapseAll() {
    setExpanded(new Set());
  }

  // ── Status change (with toast + undo) ──────────────────────────────────────
  async function setStatus(q: InterviewQuestionAuthoring, next: ReviewStatus) {
    if (q.review_status === next) return;
    const prev = q.review_status;
    setSavingId(q.id);
    try {
      await updateQuestion.mutateAsync({
        questionId: q.id,
        patch: { review_status: next },
      });
      announce(
        t("teacher_interview_config.qbank.sr.status_changed", {
          status: t(`teacher_interview_config.qbank.status.${statusMeta(next).key}`),
        }),
      );
      toast.success(
        t("teacher_interview_config.qbank.toasts.status_changed", {
          status: t(`teacher_interview_config.qbank.status.${statusMeta(next).key}`),
        }),
        {
          action: {
            label: t("common.undo"),
            onClick: () => {
              void updateQuestion.mutateAsync({
                questionId: q.id,
                patch: { review_status: prev },
              });
            },
          },
        },
      );
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_interview_config.toasts.question_approve_failed"),
      );
    } finally {
      setSavingId(null);
    }
  }

  // ── Outcome assignment (inline, with toast + undo) ──────────────────────────
  async function setOutcome(
    q: InterviewQuestionAuthoring,
    next: string | null,
  ) {
    const current = q.linked_outcome_id ?? null;
    if (current === next) return;
    const nextLabel = next
      ? (outcomeById.get(next)?.label ?? "")
      : t("teacher_interview_config.qbank.no_outcome_option");
    setSavingId(q.id);
    try {
      await updateQuestion.mutateAsync({
        questionId: q.id,
        patch: { linked_outcome_id: next },
      });
      announce(
        t("teacher_interview_config.qbank.sr.outcome_changed", {
          outcome: nextLabel,
        }),
      );
      toast.success(
        t("teacher_interview_config.qbank.toasts.outcome_changed", {
          outcome: nextLabel,
        }),
        {
          action: {
            label: t("common.undo"),
            onClick: () => {
              void updateQuestion.mutateAsync({
                questionId: q.id,
                patch: { linked_outcome_id: current },
              });
            },
          },
        },
      );
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleApproveAll() {
    if (pendingQuestions.length === 0 || approvingAll) return;
    setApprovingAll(true);
    try {
      const results = await Promise.allSettled(
        pendingQuestions.map((q) =>
          updateQuestion.mutateAsync({
            questionId: q.id,
            patch: { review_status: "approved" },
          }),
        ),
      );
      const failedCount = results.filter((r) => r.status === "rejected").length;
      const okCount = results.length - failedCount;
      if (failedCount === 0) {
        toast.success(
          t("teacher_interview_config.toasts.all_questions_approved", {
            count: okCount,
          }),
        );
      } else if (okCount > 0) {
        toast.error(
          t("teacher_interview_config.toasts.approve_all_partial", {
            approved: okCount,
            failed: failedCount,
          }),
        );
      } else {
        toast.error(t("teacher_interview_config.toasts.approve_all_failed"));
      }
    } finally {
      setApprovingAll(false);
    }
  }

  // ── Edit ────────────────────────────────────────────────────────────────────
  function beginEdit(q: InterviewQuestionAuthoring) {
    setEditingId(q.id);
    setEditingText(q.prompt_text);
    setEditingAnswer(q.model_answer ?? "");
    setEditDirty(false);
    setExpanded((prev) => new Set(prev).add(q.id));
  }
  function cancelEdit() {
    if (
      editDirty &&
      !window.confirm(t("teacher_interview_config.qbank.unsaved_confirm"))
    )
      return;
    setEditingId(null);
    setEditingText("");
    setEditingAnswer("");
    setEditDirty(false);
  }
  async function saveEdit() {
    if (!editingId || !editingText.trim()) return;
    setSavingId(editingId);
    try {
      await updateQuestion.mutateAsync({
        questionId: editingId,
        patch: {
          prompt_text: editingText.trim(),
          model_answer: editingAnswer.trim() || null,
        },
      });
      setEditingId(null);
      setEditingText("");
      setEditingAnswer("");
      setEditDirty(false);
      toast.success(t("teacher_interview_config.toasts.question_saved"));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  // ── Delete (fade + collapse exit, then PATCH) ───────────────────────────────
  async function handleDelete(q: InterviewQuestionAuthoring) {
    if (deletingIds.has(q.id)) return;
    setDeletingIds((prev) => new Set(prev).add(q.id));
    await new Promise((resolve) => setTimeout(resolve, 280));
    try {
      await deleteQuestion.mutateAsync(q.id);
      toast.success(t("teacher_interview_config.toasts.question_deleted"));
    } catch (err: unknown) {
      toast.error((err as Error).message);
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(q.id);
        return next;
      });
    }
  }

  // ── Add manual ──────────────────────────────────────────────────────────────
  async function handleAdd() {
    if (!newText.trim()) return;
    try {
      await createQuestion.mutateAsync({
        prompt_text: newText.trim(),
        question_type: "conceptual",
        model_answer: newAnswer.trim() || null,
      });
      setNewText("");
      setNewAnswer("");
      setAdding(false);
      toast.success(t("teacher_interview_config.toasts.question_added"));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  }

  // ── Reorder (position swap through a temp parking slot; see note) ───────────
  // The (config_id, position) unique constraint + per-PATCH commit means we
  // can't set A→B and B→A directly (first write collides). Swap through a
  // temp position above the current max: current→temp, neighbour→current,
  // current→neighbour.
  async function handleReorder(index: number, direction: -1 | 1) {
    if (reordering) return;
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    const current = sorted[index];
    const neighbour = sorted[target];
    const currentPos = current.position ?? index + 1;
    const neighbourPos = neighbour.position ?? target + 1;
    if (currentPos === neighbourPos) return;
    const tempPos = Math.max(...sorted.map((q, i) => q.position ?? i + 1)) + 1;
    setReordering(true);
    try {
      await updateQuestion.mutateAsync({
        questionId: current.id,
        patch: { position: tempPos },
      });
      await updateQuestion.mutateAsync({
        questionId: neighbour.id,
        patch: { position: currentPos },
      });
      await updateQuestion.mutateAsync({
        questionId: current.id,
        patch: { position: neighbourPos },
      });
      announce(
        t("teacher_interview_config.qbank.sr.moved", { position: target + 1 }),
      );
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_interview_config.toasts.question_reorder_failed"),
      );
    } finally {
      setReordering(false);
    }
  }

  const hasQuestions = sorted.length > 0;

  return (
    <div className="bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-xl shadow-glass">
      {/* Sticky toolbar: title + count + search + collapse-all + add. Sits
          below the section-nav (top-16 bar + ~52px nav ≈ top-32). */}
      <div className="sticky top-32 z-[5] rounded-t-xl border-b border-m3-outline-variant/20 bg-m3-surface-container-lowest/95 backdrop-blur-sm px-4 lg:px-6 py-3 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h3 className="font-headline font-extrabold text-base text-m3-on-surface">
              {t("teacher_interview_config.questions.list_title")}
            </h3>
            <p className="text-xs text-m3-on-surface-variant mt-0.5">
              {anyFilterActive
                ? t("teacher_interview_config.qbank.showing_filtered", {
                    shown: filtered.length,
                    total: sorted.length,
                  })
                : t("teacher_interview_config.qbank.showing_all", {
                    count: sorted.length,
                    approved: approvedCount,
                  })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {expanded.size > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={collapseAll}
                className="gap-1.5 text-xs"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                {t("teacher_interview_config.qbank.collapse_all")}
              </Button>
            )}
            {pendingQuestions.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={approvingAll || updateQuestion.isPending}
                onClick={() => void handleApproveAll()}
                className="gap-1.5 hover:bg-primary/10 hover:border-primary/40 hover:text-primary"
              >
                {approvingAll ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                {t("teacher_interview_config.questions.approve_all", {
                  count: pendingQuestions.length,
                })}
              </Button>
            )}
            {!adding && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAdding(true)}
                className="gap-1.5 hover:bg-primary/10 hover:border-primary/40 hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("teacher_interview_config.questions.add_manual")}
              </Button>
            )}
          </div>
        </div>

        {/* Search + filters — only when there are questions to filter. */}
        {hasQuestions && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-on-surface-variant/60" />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("teacher_interview_config.qbank.search_placeholder")}
                  aria-label={t("teacher_interview_config.qbank.search_placeholder")}
                  className="bg-m3-surface text-sm pl-9"
                />
              </div>
              <FilterSelect
                label={t("teacher_interview_config.qbank.filter.status")}
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as ReviewStatus | "all")}
                options={[
                  { value: "all", label: t("teacher_interview_config.qbank.filter.all") },
                  ...STATUS_ORDER.map((s) => ({
                    value: s,
                    label: t(`teacher_interview_config.qbank.status.${statusMeta(s).key}`),
                  })),
                ]}
              />
              {outcomes.length > 0 && (
                <FilterSelect
                  label={t("teacher_interview_config.qbank.filter.outcome")}
                  value={outcomeFilter}
                  onChange={(v) => setOutcomeFilter(v)}
                  options={[
                    { value: "all", label: t("teacher_interview_config.qbank.filter.all") },
                    { value: "none", label: t("teacher_interview_config.qbank.filter.no_outcome") },
                    ...outcomes
                      .slice()
                      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                      .map((o, i) => ({
                        value: o.id,
                        label: `LO${i + 1}`,
                      })),
                  ]}
                />
              )}
              {presentDifficulties.length > 0 && (
                <FilterSelect
                  label={t("teacher_interview_config.qbank.filter.difficulty")}
                  value={difficultyFilter}
                  onChange={setDifficultyFilter}
                  options={[
                    { value: "all", label: t("teacher_interview_config.qbank.filter.all") },
                    ...presentDifficulties.map((d) => ({
                      value: d,
                      label: t(`teacher_interview_config.difficulty.${d}`),
                    })),
                  ]}
                />
              )}
              {presentTypes.length > 0 && (
                <FilterSelect
                  label={t("teacher_interview_config.qbank.filter.type")}
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={[
                    { value: "all", label: t("teacher_interview_config.qbank.filter.all") },
                    ...presentTypes.map((qt) => ({
                      value: qt,
                      label: t(`teacher_interview_config.question_type.${qt}`),
                    })),
                  ]}
                />
              )}
              <FilterSelect
                label={t("teacher_interview_config.qbank.filter.source")}
                value={sourceFilter}
                onChange={(v) => setSourceFilter(v as "all" | "ai" | "manual")}
                options={[
                  { value: "all", label: t("teacher_interview_config.qbank.filter.all") },
                  { value: "ai", label: t("teacher_interview_config.qbank.source.ai") },
                  { value: "manual", label: t("teacher_interview_config.qbank.source.manual") },
                ]}
              />
            </div>

            {/* Active filter chips */}
            {anyFilterActive && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-m3-on-surface-variant">
                  {t("teacher_interview_config.qbank.active_filters")}
                </span>
                {search.trim() && (
                  <FilterChip
                    label={`"${search.trim()}"`}
                    onClear={() => setSearch("")}
                  />
                )}
                {statusFilter !== "all" && (
                  <FilterChip
                    label={t(`teacher_interview_config.qbank.status.${statusMeta(statusFilter).key}`)}
                    onClear={() => setStatusFilter("all")}
                  />
                )}
                {outcomeFilter !== "all" && (
                  <FilterChip
                    label={
                      outcomeFilter === "none"
                        ? t("teacher_interview_config.qbank.filter.no_outcome")
                        : (outcomeById.get(outcomeFilter)?.label ?? "LO")
                    }
                    onClear={() => setOutcomeFilter("all")}
                  />
                )}
                {difficultyFilter !== "all" && (
                  <FilterChip
                    label={t(`teacher_interview_config.difficulty.${difficultyFilter}`)}
                    onClear={() => setDifficultyFilter("all")}
                  />
                )}
                {typeFilter !== "all" && (
                  <FilterChip
                    label={t(`teacher_interview_config.question_type.${typeFilter}`)}
                    onClear={() => setTypeFilter("all")}
                  />
                )}
                {sourceFilter !== "all" && (
                  <FilterChip
                    label={t(`teacher_interview_config.qbank.source.${sourceFilter}`)}
                    onClear={() => setSourceFilter("all")}
                  />
                )}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[11px] font-bold text-m3-primary hover:underline cursor-pointer"
                >
                  {t("teacher_interview_config.qbank.clear_all")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 lg:p-6 space-y-3">
        {/* Add-manual inline form */}
        {adding && (
          <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low p-3 space-y-2">
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              rows={3}
              placeholder={t("teacher_interview_config.questions.add_placeholder")}
              className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm placeholder:text-m3-on-surface-variant/40 resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
            />
            <textarea
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              rows={3}
              placeholder={t("teacher_interview_config.questions.add_answer_placeholder")}
              className="w-full rounded-xl border border-dashed border-m3-secondary/30 bg-m3-secondary/[0.03] px-3 py-2.5 text-sm placeholder:text-m3-on-surface-variant/40 resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAdding(false);
                  setNewText("");
                  setNewAnswer("");
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                disabled={createQuestion.isPending || !newText.trim()}
                onClick={() => void handleAdd()}
                className="gap-2"
              >
                {createQuestion.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {t("teacher_interview_config.questions.add_save")}
              </Button>
            </div>
          </div>
        )}

        {/* Empty states */}
        {!hasQuestions ? (
          <p className="text-[11px] text-amber-700 bg-amber-50 rounded-xl px-3 py-2 leading-relaxed">
            {t("teacher_interview_config.questions.empty")}
          </p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 space-y-3">
            <p className="text-sm text-m3-on-surface-variant">
              {t("teacher_interview_config.qbank.empty_filtered")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              {t("teacher_interview_config.qbank.clear_filters")}
            </Button>
          </div>
        ) : (
          <ul className="space-y-2" role="list">
            {filtered.map((q) => {
              const displayIndex = sorted.findIndex((s) => s.id === q.id);
              return (
                <QuestionCard
                  key={q.id}
                  q={q}
                  index={displayIndex}
                  total={sorted.length}
                  expanded={expanded.has(q.id)}
                  editing={editingId === q.id}
                  editingText={editingText}
                  editingAnswer={editingAnswer}
                  outcomeOptions={outcomeOptions}
                  deleting={deletingIds.has(q.id)}
                  saving={savingId === q.id}
                  reordering={reordering}
                  onToggleExpand={() => toggleExpanded(q.id)}
                  onSetStatus={(s) => void setStatus(q, s)}
                  onSetOutcome={(o) => void setOutcome(q, o)}
                  onBeginEdit={() => beginEdit(q)}
                  onCancelEdit={cancelEdit}
                  onSaveEdit={() => void saveEdit()}
                  onChangeEditingText={(v) => {
                    setEditingText(v);
                    setEditDirty(true);
                  }}
                  onChangeEditingAnswer={(v) => {
                    setEditingAnswer(v);
                    setEditDirty(true);
                  }}
                  onDelete={() => void handleDelete(q)}
                  onMoveUp={() => void handleReorder(displayIndex, -1)}
                  onMoveDown={() => void handleReorder(displayIndex, 1)}
                />
              );
            })}
          </ul>
        )}
      </div>

      {/* Screen-reader live region for status/reorder announcements */}
      <div ref={liveRegionRef} aria-live="polite" className="sr-only" />
    </div>
  );
}

// ── Filter primitives ────────────────────────────────────────────────────────

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-m3-on-surface-variant">
      <span className="sr-only sm:not-sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="rounded-lg border border-border bg-m3-surface px-2 py-1.5 text-xs font-medium text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/30 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterChip({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove filter ${label}`}
        className="cursor-pointer rounded-full hover:bg-primary/20 p-0.5"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// ── Single question card ──────────────────────────────────────────────────────

interface QuestionCardProps {
  q: InterviewQuestionAuthoring;
  index: number;
  total: number;
  expanded: boolean;
  editing: boolean;
  editingText: string;
  editingAnswer: string;
  outcomeOptions: { id: string; label: string; text: string }[];
  deleting: boolean;
  saving: boolean;
  reordering: boolean;
  onToggleExpand: () => void;
  onSetStatus: (s: ReviewStatus) => void;
  onSetOutcome: (o: string | null) => void;
  onBeginEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onChangeEditingText: (v: string) => void;
  onChangeEditingAnswer: (v: string) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function QuestionCard({
  q,
  index,
  total,
  expanded,
  editing,
  editingText,
  editingAnswer,
  outcomeOptions,
  deleting,
  saving,
  reordering,
  onToggleExpand,
  onSetStatus,
  onSetOutcome,
  onBeginEdit,
  onCancelEdit,
  onSaveEdit,
  onChangeEditingText,
  onChangeEditingAnswer,
  onDelete,
  onMoveUp,
  onMoveDown,
}: QuestionCardProps) {
  const { t } = useTranslation();
  const meta = statusMeta(q.review_status);
  const StatusIcon = meta.Icon;
  const sourceCount = Array.isArray(q.source_refs_json)
    ? q.source_refs_json.length
    : 0;

  return (
    <li
      aria-selected={expanded}
      className={cn(
        "rounded-xl border border-m3-outline-variant/20 bg-m3-surface origin-top overflow-hidden transition-all duration-300 ease-in motion-reduce:transition-none",
        deleting
          ? "opacity-0 scale-95 -translate-x-4 max-h-0 !p-0 !my-0 border-transparent"
          : "max-h-[1200px]",
      )}
    >
      {/* Collapsed header row */}
      <div className="flex items-start gap-2 p-3">
        {/* Drag handle + number + reorder */}
        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full bg-m3-primary-fixed text-xs font-extrabold tabular-nums text-m3-primary"
            aria-hidden="true"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="flex flex-col">
            <button
              type="button"
              title={t("teacher_interview_config.questions.move_up")}
              aria-label={t("teacher_interview_config.questions.move_up")}
              disabled={reordering || index === 0}
              onClick={onMoveUp}
              className="text-m3-on-surface-variant hover:text-m3-primary disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title={t("teacher_interview_config.questions.move_down")}
              aria-label={t("teacher_interview_config.questions.move_down")}
              disabled={reordering || index === total - 1}
              onClick={onMoveDown}
              className="text-m3-on-surface-variant hover:text-m3-primary disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Prompt + metadata */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <button
            type="button"
            onClick={onToggleExpand}
            aria-expanded={expanded}
            className="block w-full text-left cursor-pointer group"
          >
            <span className="flex items-start gap-1.5">
              <ChevronDown
                className={cn(
                  "h-4 w-4 mt-0.5 shrink-0 text-m3-on-surface-variant transition-transform motion-reduce:transition-none",
                  expanded ? "rotate-0" : "-rotate-90",
                )}
                aria-hidden="true"
              />
              <span className="text-sm text-m3-on-surface font-medium leading-relaxed group-hover:text-m3-primary transition-colors">
                {q.prompt_text}
              </span>
            </span>
          </button>

          {/* Metadata row (real fields only) */}
          <div className="flex items-center gap-x-2 gap-y-1 flex-wrap pl-5.5 text-[11px] text-m3-on-surface-variant">
            <span>{t(`teacher_interview_config.question_type.${q.question_type}`)}</span>
            {q.difficulty && (
              <>
                <Sep />
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 font-semibold",
                    difficultyChipClass(q.difficulty),
                  )}
                >
                  {t(`teacher_interview_config.difficulty.${q.difficulty}`)}
                </span>
              </>
            )}
            <Sep />
            <OutcomeControl
              value={q.linked_outcome_id ?? null}
              options={outcomeOptions}
              saving={saving}
              onSetOutcome={onSetOutcome}
            />
            <Sep />
            <span className="inline-flex items-center gap-1">
              {q.ai_generated ? (
                <>
                  <Bot className="h-3 w-3" aria-hidden="true" />
                  {t("teacher_interview_config.qbank.source.ai")}
                </>
              ) : (
                <>
                  <User className="h-3 w-3" aria-hidden="true" />
                  {t("teacher_interview_config.qbank.source.manual")}
                </>
              )}
            </span>
            {sourceCount > 0 && (
              <>
                <Sep />
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3 w-3" aria-hidden="true" />
                  {t("teacher_interview_config.qbank.source_count", {
                    count: sourceCount,
                  })}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right-side controls: status + actions */}
        <div className="flex items-center gap-1 shrink-0">
          <StatusControl
            status={q.review_status}
            saving={saving}
            onSetStatus={onSetStatus}
          />
          {!editing && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onBeginEdit}
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
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={onBeginEdit} className="sm:hidden gap-2">
                    <Pencil className="h-4 w-4" />
                    {t("common.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onToggleExpand} className="gap-2">
                    <ChevronDown className="h-4 w-4" />
                    {expanded
                      ? t("teacher_interview_config.qbank.hide_answer")
                      : t("teacher_interview_config.qbank.view_answer")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="gap-2 text-red-700 focus:text-red-700 focus:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("common.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Expanded / editing body */}
      {(expanded || editing) && (
        <div className="px-3 pb-3 pl-11 space-y-2 border-t border-m3-outline-variant/10 pt-3">
          {editing ? (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("teacher_interview_config.qbank.edit_question")}
                </label>
                <textarea
                  value={editingText}
                  onChange={(e) => onChangeEditingText(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-m3-secondary/80">
                  {t("teacher_interview_config.questions.model_answer_label")}
                </label>
                <textarea
                  value={editingAnswer}
                  onChange={(e) => onChangeEditingAnswer(e.target.value)}
                  rows={4}
                  placeholder={t("teacher_interview_config.questions.add_answer_placeholder")}
                  className="w-full rounded-xl border border-dashed border-m3-secondary/30 bg-m3-secondary/[0.03] px-3 py-2 text-sm placeholder:text-m3-on-surface-variant/40 resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit}>
                  {t("common.cancel")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={saving || !editingText.trim()}
                  onClick={onSaveEdit}
                  className="gap-1.5"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {t("common.save")}
                </Button>
              </div>
            </>
          ) : q.model_answer ? (
            <div className="rounded-lg border border-dashed border-m3-secondary/30 bg-m3-secondary/[0.03] p-2.5 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-m3-secondary/80">
                {t("teacher_interview_config.questions.model_answer_label")}
              </p>
              <p className="text-sm text-m3-on-surface-variant whitespace-pre-wrap leading-relaxed">
                {q.model_answer}
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-m3-on-surface-variant/60 italic">
              {t("teacher_interview_config.questions.model_answer_missing")}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function Sep() {
  return (
    <span aria-hidden="true" className="text-m3-on-surface-variant/40">
      ·
    </span>
  );
}

// ── Inline learning-outcome control (dropdown; assign / change / clear) ──────
// Shows the currently-assigned outcome (LO label) right on the card and lets
// the teacher reassign it without opening the full edit form. Patches
// linked_outcome_id immediately (with toast + undo, handled by the parent).

function OutcomeControl({
  value,
  options,
  saving,
  onSetOutcome,
}: {
  value: string | null;
  options: { id: string; label: string; text: string }[];
  saving: boolean;
  onSetOutcome: (o: string | null) => void;
}) {
  const { t } = useTranslation();
  const current = value ? options.find((o) => o.id === value) : undefined;
  const assigned = Boolean(current);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={saving || options.length === 0}
        aria-label={t("teacher_interview_config.qbank.outcome_control_label", {
          outcome: current
            ? current.label
            : t("teacher_interview_config.qbank.no_outcome_option"),
        })}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60",
          assigned
            ? "text-m3-primary hover:bg-primary/10"
            : "text-amber-700 hover:bg-amber-50",
        )}
      >
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        ) : assigned ? (
          <Target className="h-3 w-3" aria-hidden="true" />
        ) : (
          <TriangleAlert className="h-3 w-3" aria-hidden="true" />
        )}
        {assigned
          ? current!.label
          : t("teacher_interview_config.qbank.no_outcome_short")}
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 max-w-[calc(100vw-2rem)]">
        <DropdownMenuItem
          onClick={() => onSetOutcome(null)}
          className="gap-2"
        >
          <span className={cn("truncate", !value && "font-bold")}>
            {t("teacher_interview_config.qbank.no_outcome_option")}
          </span>
          {!value && <Check className="h-3.5 w-3.5 ml-auto shrink-0" />}
        </DropdownMenuItem>
        {options.length > 0 && <DropdownMenuSeparator />}
        {options.map((o) => (
          <DropdownMenuItem
            key={o.id}
            onClick={() => onSetOutcome(o.id)}
            className="gap-2"
          >
            <span className="font-semibold text-m3-primary shrink-0">
              {o.label}
            </span>
            <span className={cn("truncate", o.id === value && "font-bold")}>
              {o.text}
            </span>
            {o.id === value && <Check className="h-3.5 w-3.5 ml-auto shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Unified status control (dropdown; icon + text, not colour alone) ─────────

function StatusControl({
  status,
  saving,
  onSetStatus,
}: {
  status: ReviewStatus;
  saving: boolean;
  onSetStatus: (s: ReviewStatus) => void;
}) {
  const { t } = useTranslation();
  const meta = statusMeta(status);
  const Icon = meta.Icon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={saving}
        aria-label={t("teacher_interview_config.qbank.status_control_label", {
          status: t(`teacher_interview_config.qbank.status.${meta.key}`),
        })}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wide cursor-pointer transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          meta.chipClass,
          saving && "opacity-60",
        )}
      >
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        ) : (
          <Icon className="h-3 w-3" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">
          {t(`teacher_interview_config.qbank.status.${meta.key}`)}
        </span>
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {STATUS_ORDER.map((s) => {
          const m = statusMeta(s);
          const MIcon = m.Icon;
          return (
            <DropdownMenuItem
              key={s}
              onClick={() => onSetStatus(s)}
              className="gap-2"
            >
              <MIcon className={cn("h-4 w-4", m.dotClass)} aria-hidden="true" />
              <span className={cn(s === status && "font-bold")}>
                {t(`teacher_interview_config.qbank.status.${m.key}`)}
              </span>
              {s === status && <Check className="h-3.5 w-3.5 ml-auto" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default QuestionBank;
