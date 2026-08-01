import { useMemo, useRef, useState } from "react";

import type {
  CourseLearningOutcomeAuthoring,
  InterviewOutcomeAuthoring,
  InterviewQuestionAuthoring,
} from "@/lib/api/types";

/**
 * Derived counts backing the outcomes summary strip: the position-sorted list,
 * the outcomeId → assigned question count index, and the covered / uncovered
 * / total-assigned tallies.
 */
export function useOutcomeMetrics(
  outcomes: InterviewOutcomeAuthoring[],
  questions: InterviewQuestionAuthoring[],
) {
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

  return {
    sorted,
    questionCountByOutcome,
    coveredCount,
    uncoveredCount,
    totalAssigned,
  };
}

/** Local UI state: inline-save flag, delete target, importer selection, live region. */
export function useOutcomesUiState() {
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

  return {
    savingId,
    setSavingId,
    confirmDelete,
    setConfirmDelete,
    importing,
    setImporting,
    selectedImport,
    setSelectedImport,
    importBusy,
    setImportBusy,
    liveRegionRef,
    announce,
  };
}

/**
 * Course outcomes still available to import.
 *
 * Course outcomes carry only text; interview outcomes also need a type +
 * weight, so imported rows get sensible defaults (knowledge / weight 3) the
 * teacher can edit afterwards. Already-imported outcomes are hidden from the
 * picker by comparing normalized text (course outcomes have no interview id).
 */
export function useImportableOutcomes(
  sorted: InterviewOutcomeAuthoring[],
  courseOutcomes: CourseLearningOutcomeAuthoring[] | undefined,
) {
  const existingTexts = useMemo(
    () => new Set(sorted.map((o) => o.outcome_text.trim().toLowerCase())),
    [sorted],
  );
  return useMemo(
    () =>
      (courseOutcomes ?? []).filter(
        (co) => !existingTexts.has(co.outcome_text.trim().toLowerCase()),
      ),
    [courseOutcomes, existingTexts],
  );
}
