import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import type { GenerationMode } from "./types";

/**
 * Generation-mode segmented toggle. Two options: topic (balanced
 * spread) vs coverage (one-or-more per section).
 */
export function ModeToggle({
  mode,
  onChange,
}: {
  mode: GenerationMode;
  onChange: (mode: GenerationMode) => void;
}) {
  const options: Array<{ key: GenerationMode; label: string; hint: string }> = [
    {
      key: "topic",
      label: "Topic",
      hint: "Balanced spread across all lessons",
    },
    {
      key: "coverage",
      label: "Coverage",
      hint: "One+ question per lesson section",
    },
  ];

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
        Generation mode
      </label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const active = mode === option.key;
          return (
            <Button variant="ghost"
              key={option.key}
              type="button"
              onClick={() => onChange(option.key)}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer h-auto whitespace-normal",
                active
                  ? "border-m3-secondary bg-m3-secondary-fixed/30 shadow-sm"
                  : "border-m3-outline-variant/20 bg-m3-surface hover:bg-m3-surface-container-low",
              )}
            >
              <span className="text-sm font-semibold text-m3-on-surface">
                {option.label}
              </span>
              <span className="text-[11px] text-m3-on-surface-variant">
                {option.hint}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Append-vs-replace toggle (FR-10b). Visible only when the quiz has
 * existing questions — replace will wipe them before generating.
 */
export function AppendToggle({
  append,
  hasExistingQuestions,
  onChange,
}: {
  append: boolean;
  hasExistingQuestions: boolean;
  onChange: (append: boolean) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
        Existing questions
      </label>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost"
          type="button"
          onClick={() => onChange(false)}
          aria-pressed={!append}
          className={cn(
            "flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer h-auto whitespace-normal",
            !append
              ? "border-m3-secondary bg-m3-secondary-fixed/30 shadow-sm"
              : "border-m3-outline-variant/20 bg-m3-surface hover:bg-m3-surface-container-low",
          )}
        >
          <span className="text-sm font-semibold text-m3-on-surface">
            Replace
          </span>
          <span className="text-[11px] text-m3-on-surface-variant">
            Wipe current questions and start fresh
          </span>
        </Button>
        <Button variant="ghost"
          type="button"
          onClick={() => onChange(true)}
          aria-pressed={append}
          className={cn(
            "flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer h-auto whitespace-normal",
            append
              ? "border-m3-secondary bg-m3-secondary-fixed/30 shadow-sm"
              : "border-m3-outline-variant/20 bg-m3-surface hover:bg-m3-surface-container-low",
          )}
        >
          <span className="text-sm font-semibold text-m3-on-surface">
            Append
          </span>
          <span className="text-[11px] text-m3-on-surface-variant">
            Add new questions next to existing ones
          </span>
        </Button>
      </div>
      {hasExistingQuestions && !append && (
        <p className="text-[11px] text-amber-700 flex items-start gap-1.5 mt-1">
          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
          This quiz already has questions. Replace will delete them before
          generating.
        </p>
      )}
    </div>
  );
}
