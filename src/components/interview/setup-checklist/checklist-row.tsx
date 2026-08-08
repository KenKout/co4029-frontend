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
  // A step the candidate has not reached is not rendered at all: setup reveals one
  // step at a time, so finishing a step hides its controls and the next appears.
  // Faded placeholder rows made the modal look like three simultaneous demands.
  if (state === "upcoming") return null;

  return (
    <li
      className={cn(
        // Centre the icon against a single-line row; only anchor it to the top
        // when the row expands (the identity row's name field), where centring
        // would float it beside the input instead of its label.
        "flex gap-3 rounded-xl border px-4 py-3 transition-colors",
        // Announce the newly revealed step rather than letting it pop in.
        state === "active" &&
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-safe:ease-out",
        children ? "items-start" : "items-center",
        state === "done" && "border-success/30 bg-success/5",
        state === "active" &&
          "border-primary/40 bg-primary-soft/40 shadow-editorial",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-full border",
          children && "mt-0.5",
          state === "done" && "border-success bg-success text-white",
          state === "active" && "border-primary/30 bg-white text-primary",
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
