import { useTranslation } from "react-i18next";

import { UndoCountdownBanner } from "@/components/ui/undo-countdown-banner";

import type { QuizManageDataController } from "./use-quiz-manage-data";

/**
 * Page-level combo-undo banner. Lifted out of the Questions tab so it
 * stays visible when a delete is queued from the Preview tab too. Fixed
 * bottom-center, z-30 (above content + top bar, below sidebar per
 * frontend/AGENTS.md).
 *
 * Delegates to the shared UndoCountdownBanner (ui/undo-countdown-banner.tsx)
 * — same countdown ring and undo affordance the notifications inbox uses for
 * its delete undo. Kept as a thin wrapper so the quiz-manage call site and its
 * i18n keys stay unchanged.
 */
export function PendingDeletesBanner({
  pendingDeletes,
}: {
  pendingDeletes: QuizManageDataController["pendingDeletes"];
}) {
  const { t } = useTranslation();
  const count = pendingDeletes.comboCount;
  return (
    <UndoCountdownBanner
      secondsLeft={pendingDeletes.secondsLeft}
      totalSeconds={5}
      message={t("teacher_quiz_manage.combo_undo.message", { count })}
      undoLabel={t("teacher_quiz_manage.combo_undo.undo", { count })}
      onUndo={pendingDeletes.undo}
    />
  );
}
