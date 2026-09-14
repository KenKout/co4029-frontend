import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Collapsible } from "@base-ui/react/collapsible";

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
  defaultOpen = true,
  collapsible = true,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  if (!collapsible) {
    return (
      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="font-headline text-base font-extrabold text-m3-on-surface">
            {title}
          </h3>
          {description ? (
            <p className="text-xs text-m3-on-surface-variant">{description}</p>
          ) : null}
        </div>
        <div className="space-y-4">{children}</div>
      </section>
    );
  }

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={setOpen}
      render={<section />}
      className="block"
    >
      <Collapsible.Trigger
        aria-label={title}
        className="flex w-full cursor-pointer list-none items-center gap-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-headline text-base font-extrabold text-m3-on-surface">
            {title}
          </span>
          {description ? (
            <span className="block text-xs text-m3-on-surface-variant">
              {description}
            </span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-5 w-5 shrink-0 text-m3-on-surface-variant transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </Collapsible.Trigger>
      {/* Feedback and override editors own unsaved local drafts. Keep them
          mounted so visually collapsing a section cannot reset work. */}
      <Collapsible.Panel
        keepMounted
        className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-300 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0"
      >
        <div className="mt-5 space-y-4 border-t border-m3-outline-variant/20 pt-5">
          {children}
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
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
        "group flex h-auto w-full min-w-0 items-start justify-start gap-3 whitespace-normal rounded-xl border p-3.5 text-left transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/40",
        "disabled:cursor-not-allowed disabled:opacity-60",
        value
          ? "border-m3-primary/40 bg-m3-primary/[0.07]"
          : "border-border bg-m3-surface-container-lowest hover:bg-m3-surface-container-high",
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
      <span className="min-w-0 flex-1 break-words">
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
      className="border-0 p-0 m-0 min-w-0 space-y-4 disabled:opacity-60"
    >
      {children}
    </fieldset>
  );
}
