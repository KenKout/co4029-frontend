import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import type { ChecklistItemState } from "./setup-stages";

export function ChecklistRow({
  state,
  icon,
  label,
  value,
  children,
}: {
  state: ChecklistItemState;
  icon: React.ReactNode;
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors",
        state === "done" && "border-success/30 bg-success/5",
        state === "active" &&
          "border-primary/40 bg-primary-soft/40 shadow-editorial",
        state === "upcoming" && "border-border bg-surface-muted/40 opacity-70",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full border",
          state === "done" && "border-success bg-success text-white",
          state === "active" && "border-primary/30 bg-white text-primary",
          state === "upcoming" &&
            "border-border-strong bg-white text-text-subtle",
        )}
      >
        {state === "done" ? (
          // Keyed on the state so the pop plays when the step actually
          // completes, not on every re-render. Same treatment the teacher-side
          // publish checklist already gives a step turning green
          // (interview-config.tsx:1460) — the candidate's own checklist just
          // swapped the glyph with no acknowledgement that anything happened.
          <Check
            key="done"
            className="h-4 w-4 motion-safe:animate-[scale-in_0.3s_cubic-bezier(0.16,1,0.3,1)_both]"
          />
        ) : (
          icon
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="text-sm font-semibold text-text-strong">{label}</p>
          {value && <p className="truncate text-sm text-text-muted">{value}</p>}
        </div>
        {children && <div className="mt-2.5">{children}</div>}
      </div>
    </li>
  );
}
