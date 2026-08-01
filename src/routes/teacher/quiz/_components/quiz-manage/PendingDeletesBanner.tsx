import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { QuizManageDataController } from "./use-quiz-manage-data";

/**
 * Page-level combo-undo banner. Lifted out of the Questions tab so it
 * stays visible when a delete is queued from the Preview tab too. Fixed
 * bottom-center, z-30 (above content + top bar, below sidebar per
 * frontend/AGENTS.md).
 *
 * Extracted from quiz-manage.tsx verbatim.
 */
export function PendingDeletesBanner({
  pendingDeletes,
}: {
  pendingDeletes: QuizManageDataController["pendingDeletes"];
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 flex items-center gap-3 rounded-xl bg-m3-inverse-surface text-m3-inverse-on-surface px-4 py-3 shadow-lg max-w-[calc(100vw-2rem)]">
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
        <svg
          className="absolute inset-0 h-8 w-8 -rotate-90"
          viewBox="0 0 32 32"
        >
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            strokeWidth="3"
            className="stroke-white/20"
          />
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            className="stroke-current text-m3-primary transition-[stroke-dashoffset] duration-300 ease-linear"
            strokeDasharray={2 * Math.PI * 14}
            strokeDashoffset={
              2 * Math.PI * 14 * (1 - pendingDeletes.secondsLeft / 5)
            }
          />
        </svg>
        <span className="text-sm font-bold tabular-nums">
          {pendingDeletes.secondsLeft}
        </span>
      </div>
      <span className="flex-1 text-sm font-medium whitespace-nowrap">
        {t("teacher_quiz_manage.combo_undo.message", {
          count: pendingDeletes.comboCount,
        })}
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={pendingDeletes.undo}
        className="gap-2 border-white/30 bg-transparent text-m3-inverse-on-surface hover:bg-white/10 hover:text-m3-inverse-on-surface shrink-0"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        {t("teacher_quiz_manage.combo_undo.undo", {
          count: pendingDeletes.comboCount,
        })}
      </Button>
    </div>
  );
}
