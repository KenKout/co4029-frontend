import type { RefObject } from "react";
import { ChevronDown, ChevronRight, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  formatClock,
  STAGE_LABEL_KEYS,
  type StageEvent,
  type TranslateFn,
} from "./generation-progress-helpers";

/**
 * Collapsible stage-event log panel. Purely presentational: the open flag, the
 * scroll anchor ref and the auto-scroll effect all stay in `GenerationProgress`
 * so the parent's hook order is unchanged by the split.
 */
export function GenerationProgressLogs({
  events,
  logsOpen,
  onToggleLogs,
  logsEndRef,
  t,
}: {
  events: readonly StageEvent[];
  logsOpen: boolean;
  onToggleLogs: () => void;
  logsEndRef: RefObject<HTMLDivElement | null>;
  t: TranslateFn;
}) {
  if (events.length === 0) return null;
  return (
    <div className="rounded-lg border border-m3-outline-variant/60 overflow-hidden">
      <Button variant="ghost"
        type="button"
        onClick={onToggleLogs}
        aria-expanded={logsOpen}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-m3-on-surface-variant hover:bg-m3-surface-container-low transition-colors cursor-pointer"
      >
        {logsOpen ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        <ScrollText className="h-3.5 w-3.5" />
        {t("teacher_quiz_results.generation.logs_toggle", {
          count: events.length,
        })}
      </Button>
      {logsOpen && (
        <div className="max-h-48 overflow-y-auto bg-m3-surface-container-lowest px-3 py-2 space-y-1 font-mono text-[11px]">
          {events.map((ev, i) => (
            <div key={`${ev.stage}-${ev.at}-${i}`} className="flex gap-2">
              <span className="shrink-0 text-m3-on-surface-variant/70 tabular-nums">
                {formatClock(ev.at)}
              </span>
              <span className="shrink-0 font-semibold text-m3-primary">
                {t(STAGE_LABEL_KEYS[ev.stage] ?? "", ev.stage)}
              </span>
              {ev.detail && (
                <span className="text-m3-on-surface-variant truncate">
                  {ev.detail}
                </span>
              )}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
}
