import {
  CheckCircle2,
  CircleDashed,
  CircleDot,
  TriangleAlert,
} from "lucide-react";

import type { InterviewQuestionAuthoring } from "@/lib/api/types";
import type {
  OutcomeMeta,
  QuestionDifficulty,
  QuestionFilterValues,
  ReviewStatus,
} from "./types";

/**
 * Pure helpers for the Question Bank, extracted from the former 2.4k-line
 * question-bank.tsx. Free of React so they can be shared between the
 * orchestrator, the filter hook and the presentational components without any
 * one of them owning the definition. Behaviour unchanged.
 */

export function statusMeta(status: ReviewStatus): {
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

export function difficultyChipClass(difficulty: QuestionDifficulty): string {
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

// ── Filter predicate parts ───────────────────────────────────────────────────
// One function per filter dimension, each returning "does this question
// survive". Short-circuit order in `buildQuestionFilterPredicate` matches the
// original single-block predicate exactly.

function matchesOutcome(
  q: InterviewQuestionAuthoring,
  outcomeFilter: QuestionFilterValues["outcomeFilter"],
): boolean {
  if (outcomeFilter === "none") return !q.linked_outcome_id;
  if (outcomeFilter === "all") return true;
  return q.linked_outcome_id === outcomeFilter;
}

function matchesSource(
  q: InterviewQuestionAuthoring,
  sourceFilter: QuestionFilterValues["sourceFilter"],
): boolean {
  if (sourceFilter === "ai") return Boolean(q.ai_generated);
  if (sourceFilter === "manual") return !q.ai_generated;
  return true;
}

function matchesTerm(
  q: InterviewQuestionAuthoring,
  term: string,
  outcomeById: Map<string, OutcomeMeta>,
): boolean {
  if (!term) return true;
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
  return haystack.includes(term);
}

/**
 * Build the question predicate for the current filter snapshot. The search
 * term is normalised once here, exactly as the original memo did before
 * entering `Array.prototype.filter`.
 */
export function buildQuestionFilterPredicate(options: {
  filters: QuestionFilterValues;
  outcomeById: Map<string, OutcomeMeta>;
}): (q: InterviewQuestionAuthoring) => boolean {
  const { filters, outcomeById } = options;
  const term = filters.search.trim().toLowerCase();
  return (q) => {
    if (
      filters.statusFilter !== "all" &&
      q.review_status !== filters.statusFilter
    )
      return false;
    if (!matchesOutcome(q, filters.outcomeFilter)) return false;
    if (
      filters.difficultyFilter !== "all" &&
      q.difficulty !== filters.difficultyFilter
    )
      return false;
    if (filters.typeFilter !== "all" && q.question_type !== filters.typeFilter)
      return false;
    if (!matchesSource(q, filters.sourceFilter)) return false;
    return matchesTerm(q, term, outcomeById);
  };
}
