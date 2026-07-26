import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SelectOption<T extends string> {
  value: T;
  label: React.ReactNode;
  /** Optional second line, e.g. what a persona actually does. */
  hint?: React.ReactNode;
}

export interface SelectProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  /** Shown when `value` matches no option (e.g. an empty-string default). */
  placeholder?: React.ReactNode;
  id?: string;
  name?: string;
  disabled?: boolean;
  /** Extra classes for the trigger button. */
  className?: string;
  "aria-label"?: string;
}

/**
 * Styled single-choice select.
 *
 * Replaces native `<select>` where the popup appearance matters: a native
 * option list is painted by the OS, so it ignores the app's radius, spacing and
 * colour tokens entirely (on Linux/Chrome it renders as a square grey-banded
 * list). Built on @base-ui/react select — the same primitive family as
 * DropdownMenu and ConfirmDialog — so focus handling, typeahead, scroll locking
 * and keyboard semantics come from the library rather than being reimplemented.
 *
 * Layering: the popup sits at `z-50`, matching DropdownMenu. That is above the
 * sidebar (`z-40`) as a portalled overlay must be, and it does not participate
 * in the `<main>` ≤ `z-20` rule that applies to in-flow page content.
 */
export function Select<T extends string>({
  value,
  onValueChange,
  options,
  placeholder,
  id,
  name,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: SelectProps<T>) {
  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={(next) => {
        // Base UI hands back `null` when a selection is cleared; this select is
        // always single-choice and never clearable, so that is not a real state.
        if (next !== null) onValueChange(next as T);
      }}
      items={options.map((o) => ({ label: o.label, value: o.value }))}
    >
      <SelectPrimitive.Trigger
        id={id}
        name={name}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-m3-outline-variant/20 bg-m3-surface px-3 py-2.5 text-left text-sm",
          "transition-colors hover:border-m3-primary/50 hover:bg-m3-primary/5",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-m3-secondary/30",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "data-popup-open:border-m3-primary/60 data-popup-open:bg-m3-primary/5",
          className,
        )}
      >
        <SelectPrimitive.Value className="truncate">
          {(v: unknown) =>
            options.find((o) => o.value === v)?.label ?? placeholder ?? null
          }
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon
          className="shrink-0 text-m3-on-surface-variant transition-transform duration-200 data-popup-open:rotate-180"
          render={<ChevronDown className="h-4 w-4" aria-hidden="true" />}
        />
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          sideOffset={6}
          alignItemWithTrigger={false}
          className="isolate z-50 outline-none"
        >
          <SelectPrimitive.Popup
            className={cn(
              // Width tracks the trigger so the list never looks detached.
              "z-50 max-h-[min(20rem,var(--available-height))] w-(--anchor-width) min-w-40 overflow-y-auto",
              "rounded-xl border border-m3-outline-variant/40 bg-white p-1.5 shadow-xl shadow-black/5",
              "origin-(--transform-origin) outline-none",
              // Enter/exit: opacity+transform only → compositor-only, no reflow.
              // The global prefers-reduced-motion rule in app.css neutralises
              // these for users who opt out.
              "transition-[opacity,transform] duration-150 ease-out",
              "data-starting-style:scale-95 data-starting-style:opacity-0",
              "data-ending-style:scale-95 data-ending-style:opacity-0",
            )}
          >
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-lg px-2.5 py-2 text-sm text-m3-on-surface outline-none",
                  "transition-colors duration-150",
                  // Two states, two different signals — deliberately not both
                  // expressed as a background tint, because near-identical fills
                  // make it ambiguous which row is which (confirmed on a real
                  // screenshot). Selected = tick + weight + a primary-coloured
                  // label. Highlighted (keyboard or pointer) = the only row with
                  // a background wash. So "your current value" and "what you're
                  // about to pick" never compete.
                  "data-selected:font-semibold data-selected:text-m3-primary",
                  "data-highlighted:bg-m3-primary/14",
                )}
              >
                {/* Fixed-width tick gutter. The indicator must NOT size the row:
                    Base UI omits `data-selected` on unselected items rather than
                    setting it to "false", so a `data-[selected=false]` padding
                    rule never matches and every label after the ticked one would
                    sit ~1.4rem further right (verified in a browser screenshot).
                    A constant-width column keeps all labels on one left edge. */}
                <span
                  className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center text-m3-primary"
                  aria-hidden="true"
                >
                  <SelectPrimitive.ItemIndicator>
                    <Check className="h-3.5 w-3.5" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <div className="min-w-0 flex-1">
                  <SelectPrimitive.ItemText className="block truncate">
                    {option.label}
                  </SelectPrimitive.ItemText>
                  {option.hint ? (
                    <span className="mt-0.5 block text-[11px] leading-snug font-normal text-m3-on-surface-variant">
                      {option.hint}
                    </span>
                  ) : null}
                </div>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
