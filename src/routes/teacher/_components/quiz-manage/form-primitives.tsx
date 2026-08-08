import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Presentational form primitives for the quiz-manage screen, extracted from
 * the former 3.5k-line quiz-manage.tsx. Purely layout/styling — no data
 * fetching or business rules — so they are safe to reuse across every tab.
 */

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="font-headline font-extrabold text-base text-m3-on-surface">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-m3-on-surface-variant">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-m3-on-surface-variant">{hint}</p>}
    </div>
  );
}

/**
 * A single on/off setting rendered as a whole-card toggle.
 *
 * The entire card is the control (not a small switch at the far right), so the
 * click target matches the text you just read and state is legible at a glance:
 * ON tints the card blue and shows a filled check, OFF stays neutral with an
 * empty outline. `role="switch"` + `aria-checked` keeps it announced as a
 * toggle rather than a plain button.
 *
 * Locking works two ways: being a real <button> it inherits `disabled` from an
 * ancestor `<fieldset disabled>` (LockableSection) for free, and the explicit
 * `disabled` prop covers layouts where that wrapper isn't available — e.g. the
 * Behavior grid, where a fieldset around a subset of cards would collapse into
 * a single grid item and break the 4-up row.
 */

export function ToggleRow({
  label,
  description,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
  /** Set directly when the card can't sit inside a `<fieldset disabled>` —
   *  e.g. in a grid where locked and unlocked cards are siblings. */
  disabled?: boolean;
}) {
  return (
    <Button variant="ghost"
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={cn(
        // h-full so cards in the same grid row match height even when one
        // description wraps to more lines than the others.
        "group flex h-full w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/40",
        "disabled:cursor-not-allowed disabled:opacity-60",
        value
          ? "border-m3-primary/40 bg-m3-primary/[0.07]"
          : "border-m3-outline-variant/25 bg-m3-surface-container-lowest hover:bg-m3-surface-container-high",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          value
            ? "border-m3-primary bg-m3-primary text-white"
            : "border-m3-outline-variant/60 bg-m3-surface",
        )}
      >
        {value && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block text-sm font-bold",
            value ? "text-m3-primary" : "text-m3-on-surface",
          )}
        >
          {label}
        </span>
        <span className="mt-0.5 block text-xs text-m3-on-surface-variant">
          {description}
        </span>
      </span>
    </Button>
  );
}

export function LockableSection({
  locked,
  children,
}: {
  locked: boolean;
  children: React.ReactNode;
}) {
  return (
    <fieldset
      disabled={locked}
      className="border-0 p-0 m-0 min-w-0 disabled:opacity-60"
    >
      {children}
    </fieldset>
  );
}
