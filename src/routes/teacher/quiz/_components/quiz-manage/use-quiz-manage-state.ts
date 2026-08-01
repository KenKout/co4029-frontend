import { useCallback, useEffect, useState } from "react";

import { useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";
import { draftFromQuiz } from "@/routes/teacher/_components/quiz-manage/helpers";
import type {
  SettingsDraft,
  TabKey,
} from "@/routes/teacher/_components/quiz-manage/types";

import type { QuizManageDataController } from "./use-quiz-manage-data";

/**
 * All local UI state for the quiz-manage page: the active tab, the settings
 * draft, dialog visibility, question selection, and the unsaved-work guard
 * that arbitrates tab switches.
 *
 * Extracted from quiz-manage.tsx verbatim — the hook call order below is the
 * order the page used, so React's hook sequence is unchanged.
 */
export function useQuizManageState({
  quiz,
  questions,
}: {
  quiz: QuizManageDataController["quiz"];
  questions: QuizManageDataController["questions"];
}) {
  const [tab, setTab] = useState<TabKey>("settings");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkSeconds, setBulkSeconds] = useState<string>("60");

  // Unsaved-work guard for tab switches. Two sources of pending edits:
  //   - the Settings draft (local until Save settings)
  //   - any question card with unsaved edits, reported up by QuestionsTab
  // Switching tabs unmounts the editor, so without this a half-finished edit
  // vanished silently — including the Questions -> Preview jump.
  const [dirtyQuestionCount, setDirtyQuestionCount] = useState(0);
  const settingsDirty =
    draft != null &&
    quiz != null &&
    JSON.stringify(draft) !== JSON.stringify(draftFromQuiz(quiz));
  const hasUnsavedWork =
    (tab === "settings" && settingsDirty) ||
    (tab === "questions" && dirtyQuestionCount > 0);
  const leaveGuard = useUnsavedChangesGuard(hasUnsavedWork);

  // Jump from the Preview tab to a specific question in the Questions editor:
  // switch tabs, then scroll the target card into view after it renders. The
  // rAF chain waits one paint so the Questions tab (and its cards) are mounted
  // before we look up the DOM node.
  const goToQuestionInEditor = useCallback((questionId: string) => {
    setTab("questions");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(`qcard-${questionId}`);
        if (!el) return;
        const reduceMotion =
          typeof window !== "undefined" &&
          typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
      });
    });
  }, []);

  useEffect(() => {
    if (quiz) setDraft(draftFromQuiz(quiz));
  }, [quiz]);

  useEffect(() => {
    setSelectedQuestionIds((current) => {
      const valid = new Set(questions.map((q) => q.id));
      const next = new Set<string>();
      current.forEach((id) => {
        if (valid.has(id)) next.add(id);
      });
      return next.size === current.size ? current : next;
    });
  }, [questions]);

  function toggleQuestionSelection(id: string) {
    setSelectedQuestionIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllQuestions() {
    setSelectedQuestionIds(new Set(questions.map((q) => q.id)));
  }

  function clearSelection() {
    setSelectedQuestionIds(new Set());
  }

  return {
    tab,
    setTab,
    confirmDelete,
    setConfirmDelete,
    confirmPublish,
    setConfirmPublish,
    draft,
    setDraft,
    showBankModal,
    setShowBankModal,
    showImportExport,
    setShowImportExport,
    selectedQuestionIds,
    bulkSeconds,
    setBulkSeconds,
    setDirtyQuestionCount,
    settingsDirty,
    leaveGuard,
    goToQuestionInEditor,
    toggleQuestionSelection,
    selectAllQuestions,
    clearSelection,
  };
}

export type QuizManageStateController = ReturnType<typeof useQuizManageState>;
