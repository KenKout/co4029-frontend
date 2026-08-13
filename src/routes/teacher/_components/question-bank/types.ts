import type { useTranslation } from "react-i18next";
import type {
  useAddToInterviewQuestionBank,
  useCheckInterviewQuestionDuplicate,
  useCreateInterviewQuestion,
  useDeleteInterviewQuestion,
  useUpdateInterviewQuestion,
} from "@/lib/api/hooks/interviews";
import type { useConfirm } from "@/components/ui/use-confirm";
import type { InterviewQuestionAuthoring } from "@/lib/api/types";

/**
 * Shared types for the Question Bank review workspace, extracted from the
 * former 2.4k-line question-bank.tsx so the orchestrator, the hooks and the
 * presentational components can agree on one definition instead of passing
 * loosely-typed props. No behavioural surface of its own.
 */

export type ReviewStatus = InterviewQuestionAuthoring["review_status"];

export type QuestionDifficulty = NonNullable<
  InterviewQuestionAuthoring["difficulty"]
>;

/** `t` exactly as the orchestrator's `useTranslation()` hands it out. */
export type TranslateFn = ReturnType<typeof useTranslation>["t"];

/** Promise-based confirm from `useConfirm`, threaded into the async handlers. */
export type ConfirmFn = ReturnType<typeof useConfirm>["confirm"];

export type UpdateQuestionMutation = ReturnType<
  typeof useUpdateInterviewQuestion
>;
export type DeleteQuestionMutation = ReturnType<
  typeof useDeleteInterviewQuestion
>;
export type CreateQuestionMutation = ReturnType<
  typeof useCreateInterviewQuestion
>;
export type CheckDuplicateMutation = ReturnType<
  typeof useCheckInterviewQuestionDuplicate
>;
export type AddToBankMutation = ReturnType<
  typeof useAddToInterviewQuestionBank
>;

/** Ordered outcome picker option: id → "LO{n}" label + outcome text. */
export interface OutcomeOption {
  id: string;
  label: string;
  text: string;
}

/** Outcome lookup value used for card metadata + search haystacks. */
export interface OutcomeMeta {
  label: string;
  text: string;
}

export type StatusFilterValue = ReviewStatus | "all";
export type OutcomeFilterValue = string | "all" | "none";
export type SourceFilterValue = "all" | "ai" | "manual";

/** The six filter dimensions the bank filters on, as one snapshot. */
export interface QuestionFilterValues {
  search: string;
  statusFilter: StatusFilterValue;
  outcomeFilter: OutcomeFilterValue;
  difficultyFilter: string;
  typeFilter: string;
  sourceFilter: SourceFilterValue;
}

/**
 * One display group in the module-grouped bank view: a single source module,
 * the shared "multiple modules" bucket, or the "unattributed" bucket.
 */
export interface ModuleGroup {
  key: string;
  title: string;
  kind: "module" | "multi" | "none";
  items: InterviewQuestionAuthoring[];
}

export interface QuestionCardProps {
  q: InterviewQuestionAuthoring;
  index: number;
  total: number;
  expanded: boolean;
  editing: boolean;
  editingText: string;
  editingAnswer: string;
  outcomeOptions: OutcomeOption[];
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
