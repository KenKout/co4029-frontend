import { toast } from "sonner";
import type { TFunction } from "i18next";

import {
  useBulkApprove,
  useBulkSetExpectedTime,
} from "@/lib/api/hooks/quizzes";
import { DEFAULT_EXPECTED_SECONDS } from "./helpers";

/**
 * The two bulk mutations the questions tab drives, their toast handling, and
 * the validity of the set-time bar. Extracted from QuestionsTab; the hooks are
 * called in the same order the tab used inline (set-time → approve).
 */
export function useQuestionsBulkActions({
  quizId,
  t,
  selectedIds,
  bulkSeconds,
  onClearSelection,
}: {
  quizId: string;
  t: TFunction;
  selectedIds: Set<string>;
  bulkSeconds: string;
  onClearSelection: () => void;
}) {
  const bulkSet = useBulkSetExpectedTime(quizId);
  const bulkApprove = useBulkApprove(quizId);

  /** Persist the pre-filled default time for every affected question at once. */
  async function handleSaveDefaultTimes(questionIds: string[]) {
    try {
      const result = await bulkSet.mutateAsync({
        question_ids: questionIds,
        expected_seconds: DEFAULT_EXPECTED_SECONDS,
      });
      toast.success(
        t("teacher_quiz_manage.toasts.expected_time_set", {
          count: result.updated,
        }),
      );
    } catch (err) {
      toast.error(
        (err as Error).message ||
          t("teacher_quiz_manage.toasts.expected_time_failed"),
      );
    }
  }

  const secondsValue = Number(bulkSeconds);
  const bulkValid =
    selectedIds.size > 0 && Number.isFinite(secondsValue) && secondsValue > 0;

  async function handleApplyBulk() {
    try {
      const result = await bulkSet.mutateAsync({
        question_ids: Array.from(selectedIds),
        expected_seconds: secondsValue,
      });
      toast.success(
        t("teacher_quiz_manage.toasts.expected_time_set", {
          count: result.updated,
        }),
      );
      onClearSelection();
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_quiz_manage.toasts.expected_time_failed"),
      );
    }
  }

  async function handleApproveBulk() {
    try {
      const result = await bulkApprove.mutateAsync({
        question_ids: Array.from(selectedIds),
      });
      toast.success(
        t("teacher_quiz_manage.toasts.bulk_approved", {
          count: result.approved,
        }),
      );
      onClearSelection();
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_quiz_manage.toasts.bulk_approve_failed"),
      );
    }
  }

  return {
    bulkSet,
    bulkApprove,
    bulkValid,
    handleSaveDefaultTimes,
    handleApplyBulk,
    handleApproveBulk,
  };
}
