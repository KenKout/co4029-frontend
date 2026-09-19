import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Box size. `sm` is the dense-list density (question pickers, result rows);
 * four call sites were passing `h-3.5 w-3.5` by hand before it existed.
 */
type CheckboxSize = "default" | "sm";

const CHECKBOX_SIZE: Record<CheckboxSize, string> = {
  default: "h-4 w-4",
  sm: "h-3.5 w-3.5",
};

export interface CheckboxProps
  extends Omit<
    React.ComponentProps<"input">,
    "type" | "onChange" | "checked" | "size"
  > {
  checked?: boolean;
  /** Tri-state: renders the dash glyph. Ignored while `checked` is true. */
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Density token. Shadows the unused native numeric `size` attribute. */
  size?: CheckboxSize;
}

/**
 * Minimal accessible checkbox over a native `<input type="checkbox">`.
 * Supports the indeterminate ("some selected") state that select-all
 * headers need — set via a ref since it isn't an HTML attribute.
 *
 * For the common case — a box with a label beside it — reach for
 * `CheckboxField` instead, which owns the row so the gap and the
 * label alignment stop being re-decided per screen.
 */
function Checkbox({
  className,
  checked,
  indeterminate,
  onCheckedChange,
  size = "default",
  ...props
}: CheckboxProps) {
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = Boolean(indeterminate) && !checked;
    }
  }, [indeterminate, checked]);

  return (
    <input
      ref={ref}
      type="checkbox"
      data-slot="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={cn(
        "shrink-0 cursor-pointer rounded border-m3-outline-variant/50 accent-m3-primary",
        CHECKBOX_SIZE[size],
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export interface CheckboxFieldProps extends CheckboxProps {
  /** The clickable label text beside the box. */
  label: React.ReactNode;
  /** Optional second line explaining the consequence of ticking it. */
  description?: React.ReactNode;
  /** Classes for the `<label>` row (layout/spacing belong here). */
  className?: string;
  /** Classes for the label text — size and weight vary by surface. */
  labelClassName?: string;
  descriptionClassName?: string;
}

/**
 * A checkbox and its label as one row.
 *
 * This existed seventeen times as hand-written markup
 * (`<label className="flex items-center gap-2"><input type="checkbox"/>
 * <span>…</span></label>`), and every copy re-decided the gap (`gap-2`,
 * `gap-2.5`, `gap-3`) and the cross-axis alignment. The ones with a
 * two-line label also had to nudge the box down with `mt-0.5` by hand, and
 * several forgot, so the box sat centred against a two-line label.
 *
 * Alignment is derived rather than passed: a single-line label centres, a
 * described one aligns to the first line's cap height. That is the rule the
 * hand-written copies were each trying to follow.
 */
function CheckboxField({
  label,
  description,
  className,
  labelClassName,
  descriptionClassName,
  size = "default",
  disabled,
  ...props
}: CheckboxFieldProps) {
  return (
    <label
      className={cn(
        "flex gap-2.5 select-none",
        description ? "items-start" : "items-center",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className,
      )}
    >
      <Checkbox
        size={size}
        disabled={disabled}
        className={description ? "mt-0.5" : undefined}
        {...props}
      />
      <span className="min-w-0">
        <span
          className={cn("block text-sm text-m3-on-surface", labelClassName)}
        >
          {label}
        </span>
        {description ? (
          <span
            className={cn(
              "mt-0.5 block text-xs text-m3-on-surface-variant",
              descriptionClassName,
            )}
          >
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export { Checkbox, CheckboxField };
