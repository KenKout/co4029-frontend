import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  Bot,
  BookMarked,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  CircleDot,
  ClipboardList,
  Dumbbell,
  FileText,
  GripVertical,
  Layers,
  Library,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Rows2,
  Rows3,
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirm } from "@/components/ui/use-confirm";
import {
  useAddToInterviewQuestionBank,
  useCheckInterviewQuestionDuplicate,
  useCreateInterviewQuestion,
  useDeleteInterviewQuestion,
  useInterviewQuestionBank,
  useUpdateInterviewQuestion,
  isActionableDuplicate,
} from "@/lib/api/hooks/interviews";
import type {
  InterviewOutcomeAuthoring,
  InterviewQuestionAuthoring,
  InterviewQuestionBankItemRead,
  InterviewQuestionDuplicateCheck,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { SegmentedFilter } from "@/components/ui/segmented-filter";
import { Select } from "@/components/ui/select";

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
  /** Parent course id — enables the course-scoped shared question bank. */
  courseId: string;
  /** Title of the module this interview belongs to (shown as a badge). */
  moduleTitle?: string | null;
  /** Course modules (id + title) for grouping questions by source module. */
  modules?: { id: string; title: string }[];
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
  courseId,
  moduleTitle,
  modules = [],
  questions,
  outcomes,
  outcomeFilterSignal,
}: QuestionBankProps) {
  const { t } = useTranslation();
  const updateQuestion = useUpdateInterviewQuestion(configId);
  const deleteQuestion = useDeleteInterviewQuestion(configId);
  const createQuestion = useCreateInterviewQuestion(configId);
  const checkDuplicate = useCheckInterviewQuestionDuplicate(configId);
  const addToBank = useAddToInterviewQuestionBank(courseId);
  const { data: bankItems } = useInterviewQuestionBank(courseId);
  const { confirm: confirmAction, dialog: confirmActionDialog } = useConfirm({
    title: t("teacher_interview_config.qbank.confirm_title", {
      defaultValue: "Confirm",
    }),
    confirmLabel: t("common.confirm"),
    cancelLabel: t("common.cancel"),
  });

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
  // A duplicate verdict awaiting the teacher's call. Holds the save it
  // interrupted so confirming resumes exactly that write — the check is
  // advisory, so "Save anyway" is always available.
  const [duplicateWarning, setDuplicateWarning] = useState<{
    check: InterviewQuestionDuplicateCheck;
    proceed: () => void;
  } | null>(null);
  // Bulk selection: ids of questions ticked for a batch action. `bulkBusy`
  // guards the contextual action bar while a batch mutation runs.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  // Compact/density mode: tighter cards + hidden metadata rows for fast triage
  // of large banks. Persisted to localStorage so the choice sticks per teacher.
  const [compact, setCompact] = useState<boolean>(() => {
    try {
      return localStorage.getItem("qbank.compact") === "1";
    } catch {
      return false;
    }
  });
  function toggleCompact() {
    setCompact((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("qbank.compact", next ? "1" : "0");
      } catch {
        // ignore storage failures (private mode etc.)
      }
      return next;
    });
  }
  // Question-bank state.
  const [bankingId, setBankingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Set<string>>(new Set());
  const [importBusy, setImportBusy] = useState(false);

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

  // Group filtered questions by source module for the bank display:
  //   - one group per module (questions attributed to exactly that module)
  //   - a dedicated "multiple modules" group for questions drawing from 2+
  //   - an "unattributed" group for legacy rows with no module ids
  // Groups render in course module order; multi-module + unattributed last.
  const moduleTitleById = useMemo(
    () => new Map(modules.map((m) => [m.id, m.title])),
    [modules],
  );
  const groupedByModule = useMemo(() => {
    const single = new Map<string, InterviewQuestionAuthoring[]>();
    const multi: InterviewQuestionAuthoring[] = [];
    const none: InterviewQuestionAuthoring[] = [];
    for (const q of filtered) {
      const ids = Array.isArray(q.source_module_ids) ? q.source_module_ids : [];
      if (ids.length === 0) none.push(q);
      else if (ids.length === 1) {
        const key = ids[0];
        const arr = single.get(key) ?? [];
        arr.push(q);
        single.set(key, arr);
      } else multi.push(q);
    }
    // Order single-module groups by the course module order when known.
    const orderedIds = [
      ...modules.map((m) => m.id).filter((id) => single.has(id)),
      ...[...single.keys()].filter((id) => !modules.some((m) => m.id === id)),
    ];
    const groups: {
      key: string;
      title: string;
      kind: "module" | "multi" | "none";
      items: InterviewQuestionAuthoring[];
    }[] = orderedIds.map((id) => ({
      key: id,
      title:
        moduleTitleById.get(id) ??
        t("teacher_interview_config.qbank.module_unknown"),
      kind: "module",
      items: single.get(id) ?? [],
    }));
    if (multi.length > 0)
      groups.push({
        key: "__multi__",
        title: t("teacher_interview_config.qbank.module_multi"),
        kind: "multi",
        items: multi,
      });
    if (none.length > 0)
      groups.push({
        key: "__none__",
        title: t("teacher_interview_config.qbank.module_none"),
        kind: "none",
        items: none,
      });
    return groups;
  }, [filtered, modules, moduleTitleById, t]);
  // Only show group headers when there's genuinely more than one group to
  // distinguish — a single-group bank renders flat as before.
  const showModuleGroups = groupedByModule.length > 1;

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

  // Count of questions per review status (over the full pool, not the filtered
  // view) so filter options and the "pending only" quick filter can show how
  // many they'll surface before you click.
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of sorted) {
      counts[q.review_status] = (counts[q.review_status] ?? 0) + 1;
    }
    return counts;
  }, [sorted]);

  // ── Bulk selection ──────────────────────────────────────────────────────
  // Selection operates over the currently FILTERED, non-deleting questions, so
  // "select all" means "all I can currently see". Selecting then changing a
  // filter keeps prior picks that are still visible and drops the rest.
  const selectableIds = useMemo(
    () => filtered.filter((q) => !deletingIds.has(q.id)).map((q) => q.id),
    [filtered, deletingIds],
  );
  const selectedVisibleIds = useMemo(
    () => selectableIds.filter((id) => selectedIds.has(id)),
    [selectableIds, selectedIds],
  );
  const allVisibleSelected =
    selectableIds.length > 0 &&
    selectedVisibleIds.length === selectableIds.length;
  const someVisibleSelected =
    selectedVisibleIds.length > 0 && !allVisibleSelected;

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (
        selectableIds.length > 0 &&
        selectableIds.every((id) => prev.has(id))
      ) {
        // Everything visible is selected → clear the visible ones.
        const next = new Set(prev);
        for (const id of selectableIds) next.delete(id);
        return next;
      }
      // Otherwise select all visible (union with any off-screen picks).
      return new Set([...prev, ...selectableIds]);
    });
  }
  function clearSelection() {
    setSelectedIds(new Set());
  }

  // Resolve the currently-selected, still-present question objects.
  const selectedQuestions = useMemo(
    () => sorted.filter((q) => selectedIds.has(q.id) && !deletingIds.has(q.id)),
    [sorted, selectedIds, deletingIds],
  );

  // Run a PATCH over every selected question, report a combined toast, and
  // clear selection. Used by set-status / set-outcome bulk actions.
  async function bulkPatch(
    patch: Partial<{
      review_status: ReviewStatus;
      linked_outcome_id: string | null;
    }>,
    successKey: string,
  ) {
    const targets = selectedQuestions;
    if (targets.length === 0 || bulkBusy) return;
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(
        targets.map((q) =>
          updateQuestion.mutateAsync({ questionId: q.id, patch }),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      const ok = results.length - failed;
      if (failed === 0) {
        toast.success(t(successKey, { count: ok }));
      } else if (ok > 0) {
        toast.error(
          t("teacher_interview_config.qbank.bulk.partial", {
            ok,
            failed,
          }),
        );
      } else {
        toast.error(t("teacher_interview_config.qbank.bulk.failed"));
      }
      clearSelection();
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkSetStatus(next: ReviewStatus) {
    await bulkPatch(
      { review_status: next },
      "teacher_interview_config.qbank.bulk.status_done",
    );
  }
  async function bulkSetOutcome(next: string | null) {
    await bulkPatch(
      { linked_outcome_id: next },
      "teacher_interview_config.qbank.bulk.outcome_done",
    );
  }
  async function bulkAddToBank() {
    const targets = selectedQuestions;
    if (targets.length === 0 || bulkBusy) return;
    setBulkBusy(true);
    try {
      let ok = 0;
      let failed = 0;
      // Sequential: keeps load gentle and matches import semantics.
      for (const q of targets) {
        // Skip anything already banked (by normalized prompt).
        if (bankedPrompts.has(q.prompt_text.trim().toLowerCase())) continue;
        try {
          await addToBank.mutateAsync({
            prompt_text: q.prompt_text,
            question_type: q.question_type,
            difficulty: q.difficulty ?? null,
            model_answer: q.model_answer ?? null,
            source_config_id: configId,
          });
          ok += 1;
        } catch {
          failed += 1;
        }
      }
      if (failed === 0) {
        toast.success(
          t("teacher_interview_config.qbank.bulk.bank_done", { count: ok }),
        );
      } else {
        toast.error(
          t("teacher_interview_config.qbank.bulk.partial", { ok, failed }),
        );
      }
      clearSelection();
    } finally {
      setBulkBusy(false);
    }
  }
  async function bulkDelete() {
    const targets = selectedQuestions;
    if (targets.length === 0 || bulkBusy) return;
    if (
      !(await confirmAction({
        description: t("teacher_interview_config.qbank.bulk.delete_confirm", {
          count: targets.length,
        }),
      }))
    )
      return;
    setBulkBusy(true);
    // Animate all selected out together, then delete.
    setDeletingIds((prev) => {
      const next = new Set(prev);
      for (const q of targets) next.add(q.id);
      return next;
    });
    await new Promise((resolve) => setTimeout(resolve, 280));
    try {
      const results = await Promise.allSettled(
        targets.map((q) => deleteQuestion.mutateAsync(q.id)),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      const ok = results.length - failed;
      if (failed === 0) {
        toast.success(
          t("teacher_interview_config.qbank.bulk.delete_done", { count: ok }),
        );
      } else {
        toast.error(
          t("teacher_interview_config.qbank.bulk.partial", { ok, failed }),
        );
        // The query refetch reconciles reality — any rows that failed to
        // delete reappear on the next invalidation.
      }
      clearSelection();
    } finally {
      setBulkBusy(false);
    }
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
  /**
   * Move a question between the graded and practice partitions.
   *
   * The two sets are disjoint: a practice question is never asked in a graded
   * run and vice versa. That is what stops a rehearsal pre-revealing the exam,
   * so moving a question here removes it from the assessment.
   */
  async function setPracticeOnly(q: InterviewQuestionAuthoring, next: boolean) {
    if ((q.practice_only ?? false) === next) return;
    setSavingId(q.id);
    try {
      await updateQuestion.mutateAsync({
        questionId: q.id,
        patch: { practice_only: next },
      });
      const msg = t(
        next
          ? "teacher_interview_config.qbank.practice.moved_to_practice"
          : "teacher_interview_config.qbank.practice.moved_to_graded",
      );
      announce(msg);
      toast.success(msg);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

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
          status: t(
            `teacher_interview_config.qbank.status.${statusMeta(next).key}`,
          ),
        }),
      );
      toast.success(
        t("teacher_interview_config.qbank.toasts.status_changed", {
          status: t(
            `teacher_interview_config.qbank.status.${statusMeta(next).key}`,
          ),
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
  async function cancelEdit() {
    if (
      editDirty &&
      !(await confirmAction({
        description: t("teacher_interview_config.qbank.unsaved_confirm"),
      }))
    )
      return;
    setEditingId(null);
    setEditingText("");
    setEditingAnswer("");
    setEditDirty(false);
  }
  /**
   * Ask the bank whether this prompt already exists.
   *
   * Returns a verdict only when there is something worth interrupting the save
   * for; `null` means "go ahead". The three non-duplicate outcomes — feature
   * disabled, check errored, genuinely unique — all collapse to `null` here
   * because none of them should stop or nag the teacher. A thrown request is
   * swallowed for the same reason: a check that could not run is not evidence
   * of a duplicate, and losing the save over it would be far worse than
   * missing one warning.
   */
  async function runDuplicateCheck(
    promptText: string,
    excludeQuestionId: string | null,
  ): Promise<InterviewQuestionDuplicateCheck | null> {
    try {
      const verdict = await checkDuplicate.mutateAsync({
        prompt_text: promptText,
        exclude_question_id: excludeQuestionId,
      });
      return isActionableDuplicate(verdict) ? verdict : null;
    } catch {
      return null;
    }
  }

  async function commitEdit(
    questionId: string,
    promptText: string,
    modelAnswer: string | null,
  ) {
    setSavingId(questionId);
    try {
      await updateQuestion.mutateAsync({
        questionId,
        patch: { prompt_text: promptText, model_answer: modelAnswer },
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

  async function saveEdit() {
    if (!editingId || !editingText.trim()) return;
    // Snapshot the draft: the confirm dialog can resume this save later, by
    // which point the editor state may have been cleared or moved on.
    const questionId = editingId;
    const promptText = editingText.trim();
    const modelAnswer = editingAnswer.trim() || null;
    setSavingId(questionId);
    // Exclude self, or editing a question without touching its wording would
    // always report the question as a duplicate of itself.
    const verdict = await runDuplicateCheck(promptText, questionId);
    setSavingId(null);
    if (verdict) {
      setDuplicateWarning({
        check: verdict,
        proceed: () => void commitEdit(questionId, promptText, modelAnswer),
      });
      return;
    }
    await commitEdit(questionId, promptText, modelAnswer);
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
  async function commitAdd(promptText: string, modelAnswer: string | null) {
    try {
      await createQuestion.mutateAsync({
        prompt_text: promptText,
        question_type: "conceptual",
        model_answer: modelAnswer,
      });
      setAdding(false);
      setNewText("");
      setNewAnswer("");
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  }

  async function handleAdd() {
    const promptText = newText.trim();
    if (!promptText) return;
    const modelAnswer = newAnswer.trim() || null;
    // No question id to exclude: nothing exists to match against yet.
    const verdict = await runDuplicateCheck(promptText, null);
    if (verdict) {
      setDuplicateWarning({
        check: verdict,
        proceed: () => void commitAdd(promptText, modelAnswer),
      });
      return;
    }
    await commitAdd(promptText, modelAnswer);
  }

  // ── Question bank: add-to-bank + import-from-bank (copy semantics) ─────────
  async function handleAddToBank(q: InterviewQuestionAuthoring) {
    setBankingId(q.id);
    try {
      await addToBank.mutateAsync({
        prompt_text: q.prompt_text,
        question_type: q.question_type,
        difficulty: q.difficulty ?? null,
        model_answer: q.model_answer ?? null,
        source_config_id: configId,
      });
      announce(t("teacher_interview_config.qbank.bank_added"));
      toast.success(t("teacher_interview_config.qbank.bank_added"));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setBankingId(null);
    }
  }

  // Items already present in THIS config (by normalized prompt) are hidden
  // from the import picker so a teacher can't obviously double-add.
  const existingPrompts = useMemo(
    () => new Set(sorted.map((q) => q.prompt_text.trim().toLowerCase())),
    [sorted],
  );
  const importableBankItems = useMemo(
    () =>
      (bankItems ?? []).filter(
        (b) => !existingPrompts.has(b.prompt_text.trim().toLowerCase()),
      ),
    [bankItems, existingPrompts],
  );

  // Prompts already present in the course bank (normalized). Drives the
  // per-question "Add to bank" disabled state + "Already in bank" label.
  const bankedPrompts = useMemo(
    () =>
      new Set((bankItems ?? []).map((b) => b.prompt_text.trim().toLowerCase())),
    [bankItems],
  );

  function toggleBankSelection(id: string) {
    setSelectedBank((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleImportFromBank() {
    const chosen = importableBankItems.filter((b) => selectedBank.has(b.id));
    if (chosen.length === 0) return;
    setImportBusy(true);
    let created = 0;
    try {
      // Sequential creates: the (config_id, position) unique constraint means
      // parallel POSTs at the same position collide. Copy semantics — each
      // becomes a fresh interview question the teacher can edit independently.
      let position = sorted.length;
      for (const b of chosen) {
        position += 1;
        await createQuestion.mutateAsync({
          prompt_text: b.prompt_text,
          question_type: b.question_type,
          difficulty: b.difficulty ?? null,
          model_answer: b.model_answer ?? null,
          position,
        });
        created += 1;
      }
      announce(
        t("teacher_interview_config.qbank.imported", { count: created }),
      );
      toast.success(
        t("teacher_interview_config.qbank.imported", { count: created }),
      );
      setImporting(false);
      setSelectedBank(new Set());
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setImportBusy(false);
    }
  }

  // Move a question from one index to an arbitrary target index (drag-drop or
  // move-to-top/bottom). Renumbers only the affected span, using a two-phase
  // temp-then-final assignment so the (config_id, position) unique constraint
  // is never violated mid-reorder. Mirrors the 3-PATCH swap `handleReorder`
  // does, generalized to any distance.
  async function handleMoveTo(fromIndex: number, toIndex: number) {
    if (reordering) return;
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= sorted.length) return;
    if (toIndex < 0 || toIndex >= sorted.length) return;

    // The ordered list of existing position values — slot i keeps positions[i];
    // items move between slots.
    const positions = sorted.map((q, i) => q.position ?? i + 1);
    const newOrder = [...sorted];
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, moved);

    // Only the items whose slot changed need a PATCH.
    const changed = newOrder
      .map((q, i) => ({
        id: q.id,
        desired: positions[i],
        prev: q.position ?? 0,
      }))
      .filter((c) => c.desired !== c.prev);
    if (changed.length === 0) return;

    const maxPos = Math.max(...positions);
    setReordering(true);
    try {
      // Phase 1: park every changed item at a unique temp position above the
      // current max, freeing their final slots without collision.
      let temp = maxPos + 1;
      for (const c of changed) {
        await updateQuestion.mutateAsync({
          questionId: c.id,
          patch: { position: temp },
        });
        temp += 1;
      }
      // Phase 2: drop each into its final position.
      for (const c of changed) {
        await updateQuestion.mutateAsync({
          questionId: c.id,
          patch: { position: c.desired },
        });
      }
      announce(
        t("teacher_interview_config.qbank.sr.moved", { position: toIndex + 1 }),
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

  // Drag-and-drop reorder state (desktop, native HTML5 DnD). `dragIndex` is the
  // grabbed row; `dragOverIndex` + `dropBefore` place the insertion LINE at the
  // top (dropBefore) or bottom edge of the hovered card, so the teacher sees
  // exactly which gap the drop will land in.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropBefore, setDropBefore] = useState<boolean>(true);
  function handleDragOverCard(cardIndex: number, before: boolean) {
    setDragOverIndex(cardIndex);
    setDropBefore(before);
  }
  function handleDrop() {
    const from = dragIndex;
    const over = dragOverIndex;
    const before = dropBefore;
    setDragIndex(null);
    setDragOverIndex(null);
    if (from === null || over === null) return;
    // Gap in original-array coordinates (0..length): the slot the line marks.
    const insertionIndex = before ? over : over + 1;
    // Translate the gap to handleMoveTo's post-removal target index: removing
    // the dragged row shifts everything after it left by one.
    let to = from < insertionIndex ? insertionIndex - 1 : insertionIndex;
    to = Math.max(0, Math.min(sorted.length - 1, to));
    void handleMoveTo(from, to);
  }

  const hasQuestions = sorted.length > 0;

  return (
    <div className="bg-m3-surface-container-lowest border border-m3-outline-variant/60 rounded-xl shadow-glass">
      {/* Sticky toolbar: title + count + search + collapse-all + add. Sits
          below the section-nav (top-16 bar + ~52px nav ≈ top-32). */}
      <div className="sticky top-32 z-[5] rounded-t-xl border-b border-m3-outline-variant/20 bg-m3-surface-container-lowest/95 backdrop-blur-sm px-4 lg:px-6 py-3 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-headline font-extrabold text-base text-m3-on-surface">
                {t("teacher_interview_config.questions.list_title")}
              </h3>
              {moduleTitle && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-m3-secondary/10 px-2 py-0.5 text-[11px] font-semibold text-m3-secondary"
                  title={t(
                    "teacher_interview_config.qbank.module_badge_tooltip",
                  )}
                >
                  <Library className="h-3 w-3" />
                  {moduleTitle}
                </span>
              )}
            </div>
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
            {hasQuestions && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleCompact}
                aria-pressed={compact}
                title={t(
                  compact
                    ? "teacher_interview_config.qbank.density_comfortable"
                    : "teacher_interview_config.qbank.density_compact",
                )}
                className="gap-1.5 text-xs"
              >
                {compact ? (
                  <Rows2 className="h-3.5 w-3.5" />
                ) : (
                  <Rows3 className="h-3.5 w-3.5" />
                )}
                {t(
                  compact
                    ? "teacher_interview_config.qbank.density_comfortable"
                    : "teacher_interview_config.qbank.density_compact",
                )}
              </Button>
            )}
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
            {!adding && !importing && (bankItems?.length ?? 0) > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedBank(new Set());
                  setImporting(true);
                }}
                className="gap-1.5 hover:bg-primary/10 hover:border-primary/40 hover:text-primary"
              >
                <Library className="h-3.5 w-3.5" />
                {t("teacher_interview_config.qbank.import_from_bank")}
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

        {/* Import-from-bank picker: multi-select course bank questions to copy
            in. Already-present questions (by prompt) are filtered out. */}
        {importing && (
          <ImportFromBankPanel
            items={importableBankItems}
            selected={selectedBank}
            onToggle={toggleBankSelection}
            busy={importBusy}
            onCancel={() => setImporting(false)}
            onConfirm={() => void handleImportFromBank()}
          />
        )}

        {/* Search + filters — only when there are questions to filter.
            Grouped into one bordered card, matching the redesigned course
            Question Bank page so the two screens read as the same product. */}
        {hasQuestions && (
          <div className="space-y-2.5 rounded-xl border border-m3-outline-variant/30 bg-m3-surface-container-lowest p-3">
            {/* Search bar on its own row */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-on-surface-variant/60" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t(
                  "teacher_interview_config.qbank.search_placeholder",
                )}
                aria-label={t(
                  "teacher_interview_config.qbank.search_placeholder",
                )}
                className="pl-9"
              />
            </div>
            {/* Filter selects below the search bar */}
            <div className="flex items-center gap-2 flex-wrap">
              {outcomes.length > 0 && (
                <FilterSelect
                  label={t("teacher_interview_config.qbank.filter.outcome")}
                  value={outcomeFilter}
                  onChange={(v) => setOutcomeFilter(v)}
                  options={[
                    {
                      value: "all",
                      label: t("teacher_interview_config.qbank.filter.all"),
                    },
                    {
                      value: "none",
                      label: t(
                        "teacher_interview_config.qbank.filter.no_outcome",
                      ),
                    },
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
                    {
                      value: "all",
                      label: t("teacher_interview_config.qbank.filter.all"),
                    },
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
                    {
                      value: "all",
                      label: t("teacher_interview_config.qbank.filter.all"),
                    },
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
                  {
                    value: "all",
                    label: t("teacher_interview_config.qbank.filter.all"),
                  },
                  {
                    value: "ai",
                    label: t("teacher_interview_config.qbank.source.ai"),
                  },
                  {
                    value: "manual",
                    label: t("teacher_interview_config.qbank.source.manual"),
                  },
                ]}
              />
            </div>

            {/* Review status gets a segmented control rather than a sixth
                dropdown. It is the dimension a teacher curating a bank acts on
                most (pending vs approved), it has a small fixed value set, and
                its counts were already being computed — they were just buried
                inside `<option>` labels, where a dropdown hides them behind a
                click. Statuses with no questions are omitted so the control
                does not grow empty segments. Counts come from `statusCounts`,
                which is deliberately computed over the UNFILTERED pool so the
                numbers do not shrink as you narrow the list.

                This also replaces the amber "pending only" pill that used to
                sit above: it was never separate state, just a shortcut setting
                statusFilter to "pending", so a "Pending (n)" segment does the
                same job without a second control competing for the same idea. */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SegmentedFilter
                ariaLabel={t("teacher_interview_config.qbank.filter.status")}
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as ReviewStatus | "all")}
                options={[
                  {
                    key: "all" as const,
                    label: t("teacher_interview_config.qbank.filter.all"),
                    count: sorted.length,
                  },
                  ...STATUS_ORDER.filter((s) => (statusCounts[s] ?? 0) > 0).map(
                    (s) => ({
                      key: s,
                      label: t(
                        `teacher_interview_config.qbank.status.${statusMeta(s).key}`,
                      ),
                      count: statusCounts[s] ?? 0,
                    }),
                  ),
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
                    label={t(
                      `teacher_interview_config.qbank.status.${statusMeta(statusFilter).key}`,
                    )}
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
                    label={t(
                      `teacher_interview_config.difficulty.${difficultyFilter}`,
                    )}
                    onClear={() => setDifficultyFilter("all")}
                  />
                )}
                {typeFilter !== "all" && (
                  <FilterChip
                    label={t(
                      `teacher_interview_config.question_type.${typeFilter}`,
                    )}
                    onClear={() => setTypeFilter("all")}
                  />
                )}
                {sourceFilter !== "all" && (
                  <FilterChip
                    label={t(
                      `teacher_interview_config.qbank.source.${sourceFilter}`,
                    )}
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

        {/* The bulk-action bar lives INSIDE the sticky toolbar rather than
            sticking on its own. It used to pin at the same `top-32` as the
            toolbar with a higher z-index, so the moment you scrolled with a
            selection active it landed on top of the search field and filter
            row and hid them. Its correct offset would have been "toolbar
            height + top-32", but the toolbar's height varies with the filter
            and chip rows, so sharing one stacking box is the fix rather than
            another hand-tuned magic number. */}
        {selectedQuestions.length > 0 && (
          <BulkActionBar
            count={selectedQuestions.length}
            busy={bulkBusy}
            outcomeOptions={outcomeOptions}
            onSetStatus={(s) => void bulkSetStatus(s)}
            onSetOutcome={(o) => void bulkSetOutcome(o)}
            onAddToBank={() => void bulkAddToBank()}
            onDelete={() => void bulkDelete()}
            onClear={clearSelection}
          />
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
              placeholder={t(
                "teacher_interview_config.questions.add_placeholder",
              )}
              className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-sm placeholder:text-m3-on-surface-variant/40 resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
            />
            <textarea
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              rows={3}
              placeholder={t(
                "teacher_interview_config.questions.add_answer_placeholder",
              )}
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
                disabled={
                  createQuestion.isPending ||
                  checkDuplicate.isPending ||
                  !newText.trim()
                }
                onClick={() => void handleAdd()}
                className="gap-2"
              >
                {(createQuestion.isPending || checkDuplicate.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {t("teacher_interview_config.questions.add_save")}
              </Button>
            </div>
          </div>
        )}

        {/* Empty states — two distinct weights. This one is "the bank is
            genuinely empty", which is a starting point rather than a problem,
            so it gets the dashed frame and the larger medallion. The
            filtered-out case below is deliberately lighter. */}
        {!hasQuestions ? (
          <div className="motion-safe:animate-[fade-in-up_0.4s_cubic-bezier(0.16,1,0.3,1)_both] space-y-3 rounded-2xl border border-dashed border-m3-outline-variant/50 bg-m3-surface-container-lowest px-4 py-10 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft">
              <ClipboardList
                className="h-7 w-7 text-m3-primary"
                aria-hidden="true"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-m3-on-surface">
                {t("teacher_interview_config.qbank.empty_title")}
              </p>
              <p className="mx-auto max-w-md text-xs text-m3-on-surface-variant leading-relaxed">
                {t("teacher_interview_config.qbank.empty_body")}
              </p>
            </div>
            {!adding && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAdding(true)}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("teacher_interview_config.questions.add_manual")}
              </Button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          // Deliberately lighter than the "no questions at all" state above:
          // nothing is wrong here, the filters are just too narrow, and the
          // only thing the teacher needs is the way out. Solid border and a
          // plain icon rather than the dashed medallion treatment reserved for
          // a genuinely empty bank — same two-weight split as the redesigned
          // sibling page.
          <div className="motion-safe:animate-[fade-in-up_0.3s_cubic-bezier(0.16,1,0.3,1)_both] rounded-xl border border-m3-outline-variant/30 bg-m3-surface-container-lowest p-8 text-center">
            <Search
              className="mx-auto h-6 w-6 text-m3-on-surface-variant/50"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-semibold text-m3-on-surface">
              {t("teacher_interview_config.qbank.empty_filtered")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="mt-3 gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              {t("teacher_interview_config.qbank.clear_filters")}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Select-all row + contextual bulk-action bar */}
            <div className="flex items-center justify-between gap-2 flex-wrap px-1">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-m3-on-surface-variant cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someVisibleSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-m3-outline-variant/60 text-m3-primary focus:ring-2 focus:ring-m3-primary/30 cursor-pointer"
                  aria-label={t(
                    "teacher_interview_config.qbank.bulk.select_all",
                  )}
                />
                {selectedVisibleIds.length > 0
                  ? t("teacher_interview_config.qbank.bulk.selected", {
                      count: selectedVisibleIds.length,
                    })
                  : t("teacher_interview_config.qbank.bulk.select_all")}
              </label>
            </div>

            {(() => {
              // Drag-to-reorder only makes sense on the flat, unfiltered list:
              // once filtered or grouped by module, the visible order no longer
              // maps 1:1 to persisted positions, so dropping would be ambiguous.
              //
              // This is NOT a rare edge case: `showModuleGroups` is true for any
              // bank spanning more than one source module, so for most real
              // courses drag is off by default and nothing ever told the
              // teacher why — the grip simply was not rendered. Reordering
              // itself still works through each card's move-to-top /
              // move-to-bottom menu, which operates in true position space, so
              // the note below points there rather than pretending the
              // capability is gone.
              const dndEnabled = !showModuleGroups && !anyFilterActive;
              const renderCard = (q: InterviewQuestionAuthoring) => {
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
                    onCancelEdit={() => void cancelEdit()}
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
                    onMoveToTop={() => void handleMoveTo(displayIndex, 0)}
                    onMoveToBottom={() =>
                      void handleMoveTo(displayIndex, sorted.length - 1)
                    }
                    onAddToBank={() => void handleAddToBank(q)}
                    onTogglePracticeOnly={() =>
                      void setPracticeOnly(q, !(q.practice_only ?? false))
                    }
                    banking={bankingId === q.id}
                    alreadyInBank={bankedPrompts.has(
                      q.prompt_text.trim().toLowerCase(),
                    )}
                    selected={selectedIds.has(q.id)}
                    onToggleSelect={() => toggleSelected(q.id)}
                    compact={compact}
                    moduleTitles={(Array.isArray(q.source_module_ids)
                      ? q.source_module_ids
                      : []
                    ).map(
                      (id) =>
                        moduleTitleById.get(id) ??
                        t("teacher_interview_config.qbank.module_unknown"),
                    )}
                    dndEnabled={dndEnabled}
                    dragging={dragIndex === displayIndex}
                    showLineBefore={
                      dragOverIndex === displayIndex && dropBefore
                    }
                    showLineAfter={
                      dragOverIndex === displayIndex && !dropBefore
                    }
                    onDragStartCard={() => setDragIndex(displayIndex)}
                    onDragOverCard={(before) =>
                      handleDragOverCard(displayIndex, before)
                    }
                    onDragEndCard={() => {
                      setDragIndex(null);
                      setDragOverIndex(null);
                    }}
                    onDropCard={handleDrop}
                  />
                );
              };
              // Explains the missing drag handle. Only shown when reordering is
              // actually unavailable, and worded for the reason it is
              // unavailable, since the two causes have different escape routes:
              // a filter can be cleared, module grouping cannot.
              const reorderNote = dndEnabled ? null : (
                <p className="px-1 pb-1 text-[11px] leading-relaxed text-m3-on-surface-variant">
                  {t(
                    anyFilterActive
                      ? "teacher_interview_config.qbank.reorder_off_filtered"
                      : "teacher_interview_config.qbank.reorder_off_grouped",
                  )}
                </p>
              );
              // Flat list when there's only one module group (or no module
              // data); grouped sections with headers otherwise.
              if (!showModuleGroups) {
                return (
                  <>
                    {reorderNote}
                    <ul className="space-y-2" role="list">
                      {filtered.map(renderCard)}
                    </ul>
                  </>
                );
              }
              return (
                <div className="space-y-5">
                  {reorderNote}
                  {groupedByModule.map((g) => (
                    <div key={g.key} className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        {g.kind === "multi" ? (
                          <Layers className="h-3.5 w-3.5 text-m3-secondary" />
                        ) : (
                          <Library className="h-3.5 w-3.5 text-m3-secondary" />
                        )}
                        <h4 className="text-xs font-bold uppercase tracking-wide text-m3-secondary">
                          {g.title}
                        </h4>
                        <span className="text-[11px] text-m3-on-surface-variant">
                          ({g.items.length})
                        </span>
                      </div>
                      <ul className="space-y-2" role="list">
                        {g.items.map(renderCard)}
                      </ul>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Screen-reader live region for status/reorder announcements */}
      <div ref={liveRegionRef} aria-live="polite" className="sr-only" />

      {confirmActionDialog}

      {/* Advisory duplicate warning. Confirm is the non-destructive path here —
          the teacher is proceeding with their own question — so the save stays
          the default-styled action and Cancel merely returns to the editor with
          the draft intact. */}
      <ConfirmDialog
        open={duplicateWarning !== null}
        onOpenChange={(next) => {
          if (!next) setDuplicateWarning(null);
        }}
        title={t("teacher_interview_config.qbank.duplicate_title")}
        description={t("teacher_interview_config.qbank.duplicate_description")}
        confirmLabel={t("teacher_interview_config.qbank.duplicate_save_anyway")}
        cancelLabel={t("teacher_interview_config.qbank.duplicate_go_back")}
        confirmVariant="default"
        onConfirm={() => {
          const pending = duplicateWarning;
          setDuplicateWarning(null);
          pending?.proceed();
        }}
        extraContent={
          duplicateWarning ? (
            <div className="space-y-2 rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                {t("teacher_interview_config.qbank.duplicate_existing")}
              </p>
              <p className="text-sm text-m3-on-surface">
                {duplicateWarning.check.duplicate_of_text}
              </p>
              {duplicateWarning.check.rationale && (
                <p className="text-xs text-m3-on-surface-variant">
                  {duplicateWarning.check.rationale}
                </p>
              )}
            </div>
          ) : null
        }
      />
    </div>
  );
}

// ── Import-from-bank picker ───────────────────────────────────────────────────

function ImportFromBankPanel({
  items,
  selected,
  onToggle,
  busy,
  onCancel,
  onConfirm,
}: {
  items: InterviewQuestionBankItemRead[];
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
        <Library
          className="h-4 w-4 text-primary mt-0.5 shrink-0"
          aria-hidden="true"
        />
        <div className="space-y-0.5">
          <p className="text-sm font-bold text-m3-on-surface">
            {t("teacher_interview_config.qbank.import_title")}
          </p>
          <p className="text-xs text-m3-on-surface-variant max-w-prose">
            {t("teacher_interview_config.qbank.import_help")}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-m3-outline-variant/30 bg-m3-surface px-3 py-2 text-xs text-m3-on-surface-variant">
          {t("teacher_interview_config.qbank.import_all_added")}
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-72 overflow-y-auto">
          {items.map((b) => {
            const isSel = selected.has(b.id);
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onToggle(b.id)}
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
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block text-sm text-m3-on-surface leading-relaxed">
                      {b.prompt_text}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {t(
                          `teacher_interview_config.qbank.type.${b.question_type}`,
                        )}
                      </Badge>
                      {b.difficulty && (
                        <span
                          className={cn(
                            "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                            difficultyChipClass(b.difficulty),
                          )}
                        >
                          {t(
                            `teacher_interview_config.qbank.difficulty.${b.difficulty}`,
                          )}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

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
          {t("teacher_interview_config.qbank.import_selected", { count })}
        </Button>
      </div>
    </div>
  );
}

// ── Bulk action bar ──────────────────────────────────────────────────────────

// Sticky contextual toolbar shown when one or more questions are selected.
// Batches the per-question actions (set status, set outcome, add to bank,
// delete) across the whole selection. All actions reuse the same mutations
// as the single-question controls, so behaviour stays consistent.
function BulkActionBar({
  count,
  busy,
  outcomeOptions,
  onSetStatus,
  onSetOutcome,
  onAddToBank,
  onDelete,
  onClear,
}: {
  count: number;
  busy: boolean;
  outcomeOptions: { id: string; label: string; text: string }[];
  onSetStatus: (s: ReviewStatus) => void;
  onSetOutcome: (o: string | null) => void;
  onAddToBank: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  return (
    // No `sticky` of its own: it is rendered inside the sticky toolbar, so it
    // inherits that stacking context and offset. Pinning it separately at the
    // same `top-32` with a higher z-index is what made it cover the search
    // field. The z-[5]/z-[6] pair it used to belong to is deliberately BELOW
    // the config screen's TabBar (z-10) — do not "normalise" those upward.
    <div className="flex items-center gap-2 flex-wrap rounded-xl border border-m3-primary/40 bg-primary-soft px-3 py-2 shadow-sm">
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-m3-primary">
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {t("teacher_interview_config.qbank.bulk.count", { count })}
      </span>

      {/* Set status */}
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md bg-white/70 px-2 py-1 text-xs font-semibold text-m3-on-surface hover:bg-white cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t("teacher_interview_config.qbank.bulk.set_status")}
          <ChevronDown className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          {STATUS_ORDER.map((s) => (
            <DropdownMenuItem
              key={s}
              onClick={() => onSetStatus(s)}
              className="gap-2"
            >
              {t(`teacher_interview_config.qbank.status.${statusMeta(s).key}`)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Set outcome */}
      {outcomeOptions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md bg-white/70 px-2 py-1 text-xs font-semibold text-m3-on-surface hover:bg-white cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Target className="h-3.5 w-3.5" />
            {t("teacher_interview_config.qbank.bulk.set_outcome")}
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-64 w-52 overflow-y-auto"
          >
            <DropdownMenuItem
              onClick={() => onSetOutcome(null)}
              className="gap-2"
            >
              {t("teacher_interview_config.qbank.no_outcome_option")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {outcomeOptions.map((o) => (
              <DropdownMenuItem
                key={o.id}
                onClick={() => onSetOutcome(o.id)}
                className="gap-2"
              >
                <span className="font-semibold shrink-0">{o.label}</span>
                <span className="truncate text-m3-on-surface-variant">
                  {o.text}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Add to bank */}
      <button
        type="button"
        disabled={busy}
        onClick={onAddToBank}
        className="inline-flex items-center gap-1 rounded-md bg-white/70 px-2 py-1 text-xs font-semibold text-m3-on-surface hover:bg-white cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <BookMarked className="h-3.5 w-3.5" />
        {t("teacher_interview_config.qbank.bulk.add_to_bank")}
      </button>

      {/* Delete */}
      <button
        type="button"
        disabled={busy}
        onClick={onDelete}
        className="inline-flex items-center gap-1 rounded-md bg-white/70 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {t("common.delete")}
      </button>

      {/* Clear selection */}
      <button
        type="button"
        onClick={onClear}
        className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="h-3.5 w-3.5" />
        {t("teacher_interview_config.qbank.bulk.clear")}
      </button>
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
      <span className="hidden font-semibold sm:inline">{label}</span>
      {/* Fixed identical width for every filter select. Under `w-auto` each one
          sized to its longest option, so a row of them stepped up and down at
          random — the redesigned sibling page names this exactly: unequal
          widths in one control row read as a bug. */}
      <Select
        size="sm"
        aria-label={label}
        value={value}
        onValueChange={onChange}
        options={options}
        className="w-[8.5rem]"
      />
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
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
      {label}
      <button
        type="button"
        onClick={onClear}
        // Was a hardcoded English string, so this button announced in English
        // to a Vietnamese screen-reader user regardless of the UI language.
        aria-label={t("teacher_interview_config.qbank.remove_filter", {
          label,
        })}
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
  onMoveToTop: () => void;
  onMoveToBottom: () => void;
  onAddToBank: () => void;
  onTogglePracticeOnly: () => void;
  banking: boolean;
  alreadyInBank: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  // Compact mode: tighter padding + hidden metadata row (unless expanded).
  compact: boolean;
  // Resolved titles of the module(s) this question was sourced from. A badge
  // renders per module; when 2+ they're shown as separate module chips.
  moduleTitles: string[];
  // Drag-to-reorder (native HTML5 DnD; desktop-only, off when filtered/grouped).
  dndEnabled: boolean;
  dragging: boolean;
  // Insertion-line indicators: a line renders at this card's top edge
  // (showLineBefore) or bottom edge (showLineAfter) to mark the drop gap.
  showLineBefore: boolean;
  showLineAfter: boolean;
  onDragStartCard: () => void;
  // `before` = cursor is in the top half of the card (insert above).
  onDragOverCard: (before: boolean) => void;
  onDragEndCard: () => void;
  onDropCard: () => void;
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
  onMoveToTop,
  onMoveToBottom,
  onAddToBank,
  onTogglePracticeOnly,
  banking,
  alreadyInBank,
  selected,
  onToggleSelect,
  compact,
  moduleTitles,
  dndEnabled,
  dragging,
  showLineBefore,
  showLineAfter,
  onDragStartCard,
  onDragOverCard,
  onDragEndCard,
  onDropCard,
}: QuestionCardProps) {
  const { t } = useTranslation();
  const sourceCount = Array.isArray(q.source_refs_json)
    ? q.source_refs_json.length
    : 0;

  // Drag is enabled only outside edit mode (so text selection in the editor
  // isn't hijacked) and only when the parent allows it (flat, unfiltered list).
  const canDrag = dndEnabled && !editing && !deleting;

  return (
    // No `aria-selected` here. It used to carry `expanded`, which was wrong
    // twice over: the attribute is not valid on an implicit `listitem` role
    // (axe flags aria-allowed-attr), and its value described the accordion
    // rather than selection — while this card genuinely does have a selected
    // state, exposed through its checkbox. Expansion is already announced
    // correctly by `aria-expanded` on the toggle button below.
    <li
      onDragOver={(e) => {
        if (!canDrag) return;
        e.preventDefault();
        // Which half of the card is the cursor in? Top half → insert above,
        // bottom half → insert below. Drives the between-cards insertion line.
        const rect = e.currentTarget.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        onDragOverCard(before);
      }}
      onDrop={(e) => {
        if (!canDrag) return;
        e.preventDefault();
        onDropCard();
      }}
      className={cn(
        // relative so the absolutely-positioned insertion lines anchor here.
        // `group` drives the hover treatments on the prompt text and the action
        // column below. NOTE: this element owns the transforms (delete
        // slide-out, hover lift), so it must never carry a keyframe animation —
        // `fade-in-up ... both` pins transform forever and would silently
        // cancel both. Entrance belongs on an inner wrapper.
        "group relative rounded-xl border bg-m3-surface origin-top overflow-hidden transition-all duration-300 ease-in motion-reduce:transition-none",
        selected
          ? "border-m3-primary/50 ring-1 ring-m3-primary/30"
          : "border-m3-outline-variant/20",
        dragging && "opacity-40",
        // Hover lift only when the card is at rest: a card that drifts under
        // the cursor while you are editing it is worse than no affordance.
        !editing &&
          !deleting &&
          "hover:-translate-y-0.5 hover:border-m3-primary/40 hover:shadow-editorial",
        deleting
          ? "opacity-0 scale-95 -translate-x-4 max-h-0 !p-0 !my-0 border-transparent"
          : "max-h-[1200px]",
      )}
    >
      {/* Between-cards insertion line — marks exactly which gap a drop lands
          in. Anchored just inside the card edge (the card has overflow-hidden
          for the delete animation, so a line in the outer gap would be
          clipped). A glow makes it read as sitting in the gap. */}
      {showLineBefore && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-2 right-2 z-10 h-0.5 rounded-full bg-m3-primary shadow-[0_0_0_2px_rgba(103,80,164,0.25)]"
        />
      )}
      {showLineAfter && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-2 right-2 z-10 h-0.5 rounded-full bg-m3-primary shadow-[0_0_0_2px_rgba(103,80,164,0.25)]"
        />
      )}
      {/* Collapsed header row */}
      <div className={cn("flex items-start gap-2", compact ? "p-2" : "p-3")}>
        {/* Selection checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label={t("teacher_interview_config.qbank.bulk.select_one")}
          className="mt-1 h-4 w-4 shrink-0 rounded border-m3-outline-variant/60 text-m3-primary focus:ring-2 focus:ring-m3-primary/30 cursor-pointer"
        />
        {/* Drag handle + number + reorder */}
        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
          {canDrag && (
            <span
              draggable
              onDragStart={onDragStartCard}
              onDragEnd={onDragEndCard}
              title={t("teacher_interview_config.qbank.drag_hint")}
              aria-label={t("teacher_interview_config.qbank.drag_hint")}
              className="text-m3-on-surface-variant/50 hover:text-m3-primary cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </span>
          )}
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full bg-m3-primary-fixed text-xs font-extrabold tabular-nums text-m3-primary"
            aria-hidden="true"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        {/* Prompt + metadata */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <p
            className={cn(
              "text-m3-on-surface font-semibold leading-relaxed",
              // Recolours with the row so the whole card reads as one hover
              // target rather than a set of separately-hoverable pieces.
              "transition-colors group-hover:text-m3-primary",
              // The prompt is the content — give it more weight than its
              // surrounding chrome. Slightly smaller in compact mode.
              compact ? "text-sm" : "text-[15px]",
            )}
          >
            {q.prompt_text}
          </p>
          {/* Explicit answer toggle — a labelled button reads far clearer than
              a bare chevron, so it's obvious this reveals the model answer. */}
          <Button
            type="button"
            variant={expanded ? "secondary" : "outline"}
            size="sm"
            onClick={onToggleExpand}
            aria-expanded={expanded}
            aria-controls={`qbank-body-${q.id}`}
            className="mt-1 h-7 gap-1.5 text-xs"
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform motion-reduce:transition-none",
                expanded ? "rotate-0" : "-rotate-90",
              )}
              aria-hidden="true"
            />
            {expanded
              ? t("teacher_interview_config.qbank.hide_answer")
              : t("teacher_interview_config.qbank.view_answer")}
          </Button>

          {/* Metadata row (real fields only). Hidden in compact mode unless
              the card is expanded, so triage lists stay dense. */}
          {(!compact || expanded) && (
            <div className="flex items-center gap-x-2 gap-y-1 flex-wrap pl-5.5 text-[11px] text-m3-on-surface-variant/80">
              <span>
                {t(`teacher_interview_config.question_type.${q.question_type}`)}
              </span>
              {/* Partition chip. Only rendered for practice questions: graded is
                  the default and the overwhelming majority, so labelling both
                  would add noise to every row to mark the exception. */}
              {q.practice_only && (
                <>
                  <Sep />
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-1.5 py-0.5 font-semibold text-sky-700">
                    <Dumbbell className="h-3 w-3" aria-hidden="true" />
                    {t("teacher_interview_config.qbank.practice.badge")}
                  </span>
                </>
              )}
              {/* Module attribution: one chip per source module. A question
                  sourced from 2+ modules therefore shows a separate chip for
                  each, making cross-module questions visible at a glance. */}
              {moduleTitles.map((title, i) => (
                <span key={`${title}-${i}`} className="contents">
                  <Sep />
                  <span className="inline-flex items-center gap-1 rounded-full bg-m3-primary-fixed/60 px-1.5 py-0.5 font-medium text-m3-primary">
                    <Layers className="h-3 w-3" aria-hidden="true" />
                    {title}
                  </span>
                </span>
              ))}
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
          )}
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
                  <DropdownMenuItem
                    onClick={onBeginEdit}
                    className="sm:hidden gap-2"
                  >
                    <Pencil className="h-4 w-4" />
                    {t("common.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onToggleExpand} className="gap-2">
                    <ChevronDown className="h-4 w-4" />
                    {expanded
                      ? t("teacher_interview_config.qbank.hide_answer")
                      : t("teacher_interview_config.qbank.view_answer")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onMoveToTop}
                    disabled={reordering || index === 0}
                    className="gap-2"
                  >
                    <ArrowUp className="h-4 w-4" />
                    {t("teacher_interview_config.qbank.move_to_top")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onMoveToBottom}
                    disabled={reordering || index === total - 1}
                    className="gap-2"
                  >
                    <ArrowDown className="h-4 w-4" />
                    {t("teacher_interview_config.qbank.move_to_bottom")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onAddToBank}
                    disabled={banking || alreadyInBank}
                    className="gap-2"
                  >
                    {banking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : alreadyInBank ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <BookMarked className="h-4 w-4" />
                    )}
                    {alreadyInBank
                      ? t("teacher_interview_config.qbank.already_in_bank")
                      : t("teacher_interview_config.qbank.add_to_bank")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onTogglePracticeOnly}
                    className="gap-2"
                  >
                    <Dumbbell className="h-4 w-4" />
                    {t(
                      q.practice_only
                        ? "teacher_interview_config.qbank.practice.move_to_graded"
                        : "teacher_interview_config.qbank.practice.move_to_practice",
                    )}
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

      {/* Expanded / editing body — slides open/closed via a grid-rows
          transition (0fr → 1fr) so "View answer"/"Hide answer" animates up and
          down instead of snapping. */}
      <div
        id={`qbank-body-${q.id}`}
        className={cn(
          "grid transition-all duration-300 ease-out motion-reduce:transition-none",
          expanded || editing
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
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
                    placeholder={t(
                      "teacher_interview_config.questions.add_answer_placeholder",
                    )}
                    className="w-full rounded-xl border border-dashed border-m3-secondary/30 bg-m3-secondary/[0.03] px-3 py-2 text-sm placeholder:text-m3-on-surface-variant/40 resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onCancelEdit}
                  >
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
        </div>
      </div>
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
      <DropdownMenuContent
        align="start"
        className="w-72 max-w-[calc(100vw-2rem)]"
      >
        <DropdownMenuItem onClick={() => onSetOutcome(null)} className="gap-2">
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
            {o.id === value && (
              <Check className="h-3.5 w-3.5 ml-auto shrink-0" />
            )}
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
