import type { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { ApiError } from "@/lib/api/client";
import type { SettingsDraft } from "@/routes/teacher/_components/quiz-manage/types";

import { buildNewQuestionPayload, settingsPatchFromDraft } from "./helpers";
import type { TranslateFn } from "./types";
import type { QuizManageDataController } from "./use-quiz-manage-data";
import type { QuizManageStateController } from "./use-quiz-manage-state";

export interface QuizManageActionDeps {
  t: TranslateFn;
  navigate: ReturnType<typeof useNavigate>;
  courseId: string;
  moduleId: string;
  publishDisabled: boolean;
  draft: SettingsDraft | null;
  data: QuizManageDataController;
  state: QuizManageStateController;
}

/**
 * The four async page-level mutations (delete quiz, publish quiz, add
 * question, save settings) plus the post-delete navigation.
 *
 * A plain factory rather than a hook: the page builds these AFTER its
 * loading / not-found early returns (they need the resolved `moduleId`), so a
 * `use*` function here would be a rules-of-hooks violation. It holds no hooks,
 * and the handlers are recreated per render exactly as they were when they
 * lived inline in quiz-manage.tsx.
 */
export function createQuizManageActions({
  t,
  navigate,
  courseId,
  moduleId,
  publishDisabled,
  draft,
  data,
  state,
}: QuizManageActionDeps) {
  const { deleteQuiz, publishQuiz, patchQuiz, addQuestion } = data;

  function returnToModule() {
    void navigate({
      to: "/teacher/courses/$courseId/modules/$moduleId",
      params: { courseId, moduleId },
    });
  }

  async function handleDelete() {
    try {
      await deleteQuiz.mutateAsync();
      toast.success(t("teacher_quiz_manage.toasts.deleted"));
      returnToModule();
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || t("teacher_quiz_manage.toasts.delete_failed"),
      );
    } finally {
      state.setConfirmDelete(false);
    }
  }

  async function handlePublish() {
    if (publishDisabled) return;
    try {
      await publishQuiz.mutateAsync();
      toast.success(t("teacher_quiz_manage.toasts.published"));
      state.setConfirmPublish(false);
    } catch (err: unknown) {
      if (
        err instanceof ApiError &&
        err.status === 422 &&
        (err.code === "missing_t_exp" ||
          err.code === "missing_expected_response_time" ||
          err.code === "missing_expected_time")
      ) {
        state.setConfirmPublish(false);
        return;
      }
      // Backend approval gate (pending_review): keep the dialog open is
      // pointless since the gate can't be satisfied from here — surface the
      // message and close so the teacher goes back to approve questions.
      if (
        err instanceof ApiError &&
        err.status === 422 &&
        err.code === "pending_review"
      ) {
        toast.error(t("teacher_quiz_manage.toasts.publish_pending_review"));
        state.setConfirmPublish(false);
        return;
      }
      toast.error(
        (err as Error).message ||
          t("teacher_quiz_manage.toasts.publish_failed"),
      );
    }
  }

  async function handleAddQuestion(questionType = "multiple_choice") {
    const payload = buildNewQuestionPayload(questionType, t);
    try {
      await addQuestion.mutateAsync(payload);
      toast.success(t("teacher_quiz_manage.toasts.question_added"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_quiz_manage.toasts.add_question_failed"),
      );
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    if (!draft.title.trim()) {
      toast.error(t("teacher_quiz_manage.errors.title_required"));
      return;
    }
    try {
      await patchQuiz.mutateAsync(settingsPatchFromDraft(draft));
      toast.success(t("teacher_quiz_manage.toasts.settings_saved"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_quiz_manage.toasts.save_settings_failed"),
      );
    }
  }

  return {
    handleDelete,
    handlePublish,
    handleAddQuestion,
    handleSaveSettings,
  };
}

export type QuizManageActions = ReturnType<typeof createQuizManageActions>;
