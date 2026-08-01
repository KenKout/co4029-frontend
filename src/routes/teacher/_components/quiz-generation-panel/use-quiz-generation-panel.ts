import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ApiError } from "@/lib/api/client";
import { useAuthoringModuleLessons } from "@/lib/api/hooks/teacher-courses";
import { useGenerateQuiz } from "@/lib/api/hooks/quizzes";

import { buildGeneratePayload, validateGenerationForm } from "./helpers";
import { useGenerationForm } from "./use-generation-form";
import {
  useGenerationRunTracking,
  useRunTerminalToasts,
} from "./use-generation-run";
import { useOutcomeTree } from "./use-outcome-tree";

export interface QuizGenerationPanelProps {
  quizId: string;
  moduleId: string;
  courseId?: string;
  hasExistingQuestions: boolean;
  onRunStarted?: (runId: string) => void;
}

/**
 * Everything the quiz generation panel needs, in the exact hook order the
 * pre-split 550-line `QuizGenerationPanel` body used: mutation, source
 * lessons, outcome tree, run tracking, form state, then the terminal-state
 * toast guard.
 */
export function useQuizGenerationPanel({
  quizId,
  moduleId,
  courseId,
  hasExistingQuestions,
  onRunStarted,
}: QuizGenerationPanelProps) {
  const { t } = useTranslation();
  const generateQuiz = useGenerateQuiz(quizId);
  const { data: lessons = [] } = useAuthoringModuleLessons(moduleId);
  const { outcomes, childrenByParent, outcomeWithDescendants } =
    useOutcomeTree(courseId);
  const { activeRunId, setActiveRunId, activeRun, displayRun } =
    useGenerationRunTracking(quizId);
  const formState = useGenerationForm(hasExistingQuestions);
  const { form, setForm, selectedLessonIds, bloomOverflow } = formState;

  const generationInProgress =
    generateQuiz.isPending ||
    Boolean(
      activeRunId &&
        (!activeRun ||
          activeRun.status === "pending" ||
          activeRun.status === "running"),
    );

  useRunTerminalToasts(activeRun, activeRunId);

  function toggleOutcome(outcomeId: string) {
    // Cascade selection down the outcome tree: toggling a node flips that node
    // AND all of its descendants to the same state. Selecting a parent selects
    // every child by default; unselecting the parent clears them all. This
    // keeps the target set consistent with the L.O. hierarchy shown below.
    const affected = outcomeWithDescendants(outcomeId);
    setForm((current) => {
      const willSelect = !current.target_outcome_ids.includes(outcomeId);
      const next = new Set(current.target_outcome_ids);
      if (willSelect) {
        for (const id of affected) next.add(id);
      } else {
        for (const id of affected) next.delete(id);
      }
      return { ...current, target_outcome_ids: [...next] };
    });
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const invalid = validateGenerationForm(form, {
      selectedLessonCount: selectedLessonIds.length,
      bloomOverflow,
    });
    if (invalid) {
      toast.error(invalid);
      return;
    }

    try {
      const run = await generateQuiz.mutateAsync(
        buildGeneratePayload(form, selectedLessonIds, hasExistingQuestions),
      );
      setActiveRunId(run.id);
      onRunStarted?.(run.id);
      toast.success("Quiz generation started");
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(
          "A generation is still running for this quiz. Refresh in a moment.",
        );
        return;
      }
      toast.error((err as Error).message || "Failed to start quiz generation");
    }
  }

  return {
    ...formState,
    t,
    lessons,
    outcomes,
    childrenByParent,
    displayRun,
    generationInProgress,
    hasExistingQuestions,
    toggleOutcome,
    handleGenerate,
  };
}

export type QuizGenerationController = ReturnType<
  typeof useQuizGenerationPanel
>;
