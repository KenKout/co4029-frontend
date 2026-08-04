import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Shared countdown undo banner for deferred (combo) deletes — the "you have N
 * seconds to undo" snackbar, originally extracted from the quiz-manage
 * question delete (PendingDeletesBanner). Reused by the notifications inbox
 * for its 5s delete undo, so both surfaces render the identical countdown
 * ring and undo affordance instead of drifting apart.
 *
 * Fixed bottom-center, z-30 (above content + top bar, below sidebar per
 * frontend/AGENTS.md). `secondsLeft`/`totalSeconds` drive the ring; the
 * caller supplies localized message + undo label.
 */
export function UndoCountdownBanner({
  secondsLeft,
  totalSeconds = 5,
  message,
  undoLabel,
  onUndo,
}: {
  secondsLeft: number;
  totalSeconds?: number;
  message: string;
  undoLabel: string;
  onUndo: () => void;
}) {
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
              2 * Math.PI * 14 * (1 - secondsLeft / Math.max(totalSeconds, 1))
            }
          />
        </svg>
        <span className="text-sm font-bold tabular-nums">
          {Math.max(0, secondsLeft)}
        </span>
      </div>
      <span className="flex-1 text-sm font-medium whitespace-nowrap">
        {message}
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onUndo}
        className="gap-2 border-white/30 bg-transparent text-m3-inverse-on-surface hover:bg-white/10 hover:text-m3-inverse-on-surface shrink-0"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        {undoLabel}
      </Button>
    </div>
  );
}
