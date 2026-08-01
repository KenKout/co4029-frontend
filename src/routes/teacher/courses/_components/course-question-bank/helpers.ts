import type {
  InterviewDifficulty,
  InterviewQuestionBankItemRead,
} from "@/lib/api/types";
import type { QuestionBankFilterValues } from "./types";

/**
 * Pure derivations for the course-level Question Bank management page,
 * extracted from the former 843-line course-question-bank.tsx. No React, no
 * data access — same inputs, same outputs as the in-component code they
 * replace.
 */

/**
 * Difficulty is an ORDERED scale, so the chips are one hue ramping in
 * saturation — three unrelated hues (teal / blue / purple) read as three
 * unrelated categories and hid the ordering.
 */
export function difficultyChipClass(difficulty: InterviewDifficulty): string {
  switch (difficulty) {
    case "senior":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "mid_level":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "junior":
    default:
      return "bg-sky-50 text-sky-700 border-sky-200";
  }
}

/** Every distinct tag in the bank, sorted, for the tag filter options. */
export function collectBankTags(
  items: InterviewQuestionBankItemRead[] | undefined,
): string[] {
  const set = new Set<string>();
  for (const item of items ?? []) {
    for (const tag of item.tags ?? []) set.add(tag);
  }
  return Array.from(set).sort();
}

/** Type / difficulty / tag / free-text filtering, in that order. */
export function filterBankItems(
  items: InterviewQuestionBankItemRead[] | undefined,
  filters: QuestionBankFilterValues,
): InterviewQuestionBankItemRead[] {
  const { search, typeFilter, difficultyFilter, tagFilter } = filters;
  const q = search.trim().toLowerCase();
  return (items ?? []).filter((item) => {
    if (typeFilter !== "all" && item.question_type !== typeFilter) return false;
    if (difficultyFilter !== "all" && item.difficulty !== difficultyFilter)
      return false;
    if (tagFilter !== "all" && !(item.tags ?? []).includes(tagFilter))
      return false;
    if (!q) return true;
    return (
      item.prompt_text.toLowerCase().includes(q) ||
      (item.model_answer ?? "").toLowerCase().includes(q) ||
      (item.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
    );
  });
}

/**
 * Per-type counts drive the segmented filter badges: the teacher can see the
 * shape of the bank without applying a filter to find out.
 */
export function countBankItemsByType(
  items: InterviewQuestionBankItemRead[] | undefined,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items ?? []) {
    counts.set(item.question_type, (counts.get(item.question_type) ?? 0) + 1);
  }
  return counts;
}

/** How many bank items carry a non-blank model answer. */
export function countBankItemsWithAnswer(
  items: InterviewQuestionBankItemRead[] | undefined,
): number {
  return (items ?? []).filter((i) => (i.model_answer ?? "").trim()).length;
}
