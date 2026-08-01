import { useEffect, useMemo } from "react";
import { toast } from "sonner";

import { useCourseModules, useModuleLessons } from "@/lib/api/hooks/courses";
import {
  useImportQuestionsFromBank,
  useQuestionBank,
} from "@/lib/api/hooks/quizzes";
import type { QuestionBankEntry } from "@/lib/api/types";

import type { QuestionBankModalProps } from "./types";
import { useBankFilters, useBankSelection } from "./use-bank-filters";

/**
 * Controller for the question-bank modal, composed in the exact hook order the
 * pre-split 354-line `QuestionBankModal` body used: filter state, selection
 * state, the search debounce, module / lesson lookups, the module-change reset,
 * the bank query, the importer, then the active-filter tally.
 */
export function useQuestionBankModal({
  courseId,
  quizId,
  defaultModuleId,
  onClose,
}: QuestionBankModalProps) {
  const filters = useBankFilters(defaultModuleId);
  const selection = useBankSelection();
  const {
    moduleId,
    lessonId,
    questionType,
    bloomLevel,
    difficulty,
    reviewStatus,
    searchInput,
    search,
    setLessonId,
    setSearch,
  } = filters;

  // Debounce live search — 300 ms after the user stops typing.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const modulesQuery = useCourseModules(courseId);
  const lessonsQuery = useModuleLessons(moduleId || undefined);

  // Reset lesson selection when module changes (the lesson list is
  // module-scoped, so a lesson from module A is meaningless under B).
  useEffect(() => {
    setLessonId("");
  }, [moduleId]);

  const bank = useQuestionBank(courseId, {
    moduleId: moduleId || undefined,
    lessonId: lessonId || undefined,
    questionType: questionType || undefined,
    bloomLevel: bloomLevel || undefined,
    difficulty: difficulty || undefined,
    reviewStatus,
    search: search || undefined,
    excludeQuizId: quizId,
  });
  const rows = bank.items;

  const importer = useImportQuestionsFromBank(quizId);

  const activeFilterCount = useMemo(() => {
    return [
      moduleId,
      lessonId,
      questionType,
      bloomLevel,
      difficulty,
      reviewStatus !== "approved" ? "x" : "",
      search,
    ].filter(Boolean).length;
  }, [
    moduleId,
    lessonId,
    questionType,
    bloomLevel,
    difficulty,
    reviewStatus,
    search,
  ]);

  function selectAllVisible() {
    selection.setSelected((current) => {
      const next = new Set(current);
      for (const entry of rows) next.add(entry.question.id);
      return next;
    });
  }

  async function handleImport() {
    if (selection.selected.size === 0) {
      toast.error("Pick at least one question to import");
      return;
    }
    try {
      const cloned = await importer.mutateAsync(Array.from(selection.selected));
      toast.success(
        `Imported ${cloned.length} question${cloned.length === 1 ? "" : "s"}`,
      );
      onClose();
    } catch (err) {
      toast.error((err as Error).message ?? "Import failed");
    }
  }

  const allVisibleSelected =
    rows.length > 0 &&
    rows.every((entry: QuestionBankEntry) =>
      selection.selected.has(entry.question.id),
    );

  return {
    ...filters,
    ...selection,
    bank,
    rows,
    isLoading: bank.isLoading,
    error: bank.error,
    importer,
    modules: modulesQuery.data ?? [],
    lessons: lessonsQuery.data ?? [],
    modulesLoading: modulesQuery.isLoading,
    lessonsLoading: lessonsQuery.isLoading,
    activeFilterCount,
    allVisibleSelected,
    selectAllVisible,
    handleImport,
  };
}

export type QuestionBankModalController = ReturnType<
  typeof useQuestionBankModal
>;
