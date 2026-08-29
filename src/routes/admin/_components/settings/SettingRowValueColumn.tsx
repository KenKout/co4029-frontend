import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SettingRowController } from "./use-setting-row";

/** Control column — fixed 200px so every right edge lines up. */
export function SettingRowValueColumn({
  controller,
  showComparison,
  globalFallback,
  control,
}: {
  controller: SettingRowController;
  showComparison: boolean;
  globalFallback: boolean | number;
  control: ReactNode;
}) {
  const { overrideAtThisScope, stageClear } = controller;

  return (
    <div className="flex items-start gap-1.5">
      <div className="min-w-0 flex-1">
        {showComparison && (
          <p className="mb-1 text-[11px] text-slate-400">
            Global:{" "}
            <span className="font-mono text-slate-500">
              {String(globalFallback)}
            </span>
          </p>
        )}
        {control}
      </div>
      <Button
        variant="ghost"
        type="button"
        title={
          overrideAtThisScope
            ? "Remove this override and fall back to the level below"
            : "Nothing is overridden at this scope"
        }
        className="mt-0.5 shrink-0 rounded-md p-1.5 text-slate-400 enabled:hover:bg-slate-100 enabled:hover:text-slate-700 disabled:opacity-30 h-auto whitespace-normal"
        disabled={!overrideAtThisScope}
        onClick={stageClear}
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
