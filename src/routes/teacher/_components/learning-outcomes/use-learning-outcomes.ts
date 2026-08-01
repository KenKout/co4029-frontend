import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useTeacherCourseOutcomes } from "@/lib/api/hooks/courses";
import {
  useCreateInterviewOutcome,
  useDeleteInterviewOutcome,
  useUpdateInterviewOutcome,
} from "@/lib/api/hooks/interviews";
import type { InterviewOutcomeAuthoring } from "@/lib/api/types";

import type { LearningOutcomesProps } from "./types";
import {
  useImportableOutcomes,
  useOutcomeMetrics,
  useOutcomesUiState,
} from "./use-outcome-metrics";

/**
 * Controller for the interview learning-outcomes section, composed in the exact
 * hook order the pre-split 370-line `LearningOutcomes` body used: mutations,
 * course outcomes, derived metrics, local UI state, then the importable list.
 */
export function useLearningOutcomes({
  configId,
  courseId,
  outcomes,
  questions,
}: Omit<LearningOutcomesProps, "minOutcomesToPass" | "onViewQuestions">) {
  const { t } = useTranslation();
  const createOutcome = useCreateInterviewOutcome(configId);
  const updateOutcome = useUpdateInterviewOutcome(configId);
  const deleteOutcome = useDeleteInterviewOutcome(configId);
  const { data: courseOutcomes } = useTeacherCourseOutcomes(courseId);

  const metrics = useOutcomeMetrics(outcomes, questions);
  const ui = useOutcomesUiState();
  const importableOutcomes = useImportableOutcomes(
    metrics.sorted,
    courseOutcomes,
  );

  function openImport() {
    ui.setSelectedImport(new Set());
    ui.setImporting(true);
  }

  function toggleImportSelection(id: string) {
    ui.setSelectedImport((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submitImport() {
    const chosen = importableOutcomes.filter((co) =>
      ui.selectedImport.has(co.id),
    );
    if (chosen.length === 0) return;
    ui.setImportBusy(true);
    let created = 0;
    try {
      // Sequential creates: the (config_id, position) unique constraint means
      // parallel POSTs at the same position would collide.
      let position = metrics.sorted.length;
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
      ui.announce(
        t("teacher_interview_config.outcomes.imported", { count: created }),
      );
      toast.success(
        t("teacher_interview_config.outcomes.imported", { count: created }),
      );
      ui.setImporting(false);
      ui.setSelectedImport(new Set());
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      ui.setImportBusy(false);
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
    ui.setSavingId(o.id);
    try {
      await updateOutcome.mutateAsync({
        outcomeId: o.id,
        patch: { importance_weight: clamped },
      });
      ui.announce(
        t("teacher_interview_config.outcomes.weight_badge", {
          weight: clamped,
        }),
      );
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      ui.setSavingId(null);
    }
  }

  async function doDelete(o: InterviewOutcomeAuthoring) {
    try {
      await deleteOutcome.mutateAsync(o.id);
      ui.announce(t("teacher_interview_config.outcomes.deleted"));
      toast.success(t("teacher_interview_config.outcomes.deleted"));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      ui.setConfirmDelete(null);
    }
  }

  return {
    ...metrics,
    ...ui,
    t,
    courseOutcomes,
    deleteOutcome,
    importableOutcomes,
    hasOutcomes: metrics.sorted.length > 0,
    openImport,
    toggleImportSelection,
    submitImport,
    setWeight,
    doDelete,
  };
}

export type LearningOutcomesController = ReturnType<typeof useLearningOutcomes>;
