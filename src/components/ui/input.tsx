import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

/**
 * Density tokens. `default` deliberately mirrors the `Select` trigger box model
 * (both `h-10 rounded-xl px-3 text-sm`) so a text field and a dropdown
 * sitting in the same form row are the same height and the same radius — before
 * this, inputs were `h-8 rounded-md` (32px) next to 42px `rounded-xl` selects,
 * which is what made the interview-config cards look ragged.
 *
 * `sm` is the compact inline density for table toolbars / filter chip rows, and
 * is byte-identical to `Select`'s own `sm` token so a search field and a filter
 * chip in the same toolbar row line up exactly.
 *
 * Both tokens are expressed as an explicit `h-*` (not vertical padding) so that
 * a call site which must height-match a sibling control can override with
 * `className="h-9"` and have `tailwind-merge` actually drop the token — a `py-*`
 * token would survive the merge and fight the height.
 */
const INPUT_SIZE: Record<"default" | "sm", string> = {
  default: "h-10 rounded-xl px-3 text-sm",
  sm: "h-7 rounded-md px-2.5 text-xs",
};

/**
 * `bare` is the inline-editor escape hatch: a click-to-edit title, a tag
 * composer inside a chip row, an option row inside a question card. Those are
 * not form fields and want none of the box -- no height, radius, border or
 * hover/focus chrome -- but should still inherit the placeholder, disabled,
 * aria-invalid and number-spinner behaviour. Without it each one hand-rolled
 * a native <input> and drifted.
 */
type InputVariant = "default" | "bare";

const INPUT_VARIANT: Record<InputVariant, string> = {
  // No height here: that is INPUT_SIZE's job, and this string is concatenated
  // after it, so an `h-*` token would silently beat `size="sm"`.
  default:
    "border border-m3-outline-variant/60 bg-m3-surface " +
    "disabled:bg-m3-surface-container",
  bare: "border-0 bg-transparent p-0 text-sm",
};

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size"> {
  /**
   * Density token. Shadows the native numeric `size` attribute (which nothing
   * in this app uses — width comes from Tailwind) hence the `Omit` above.
   */
  size?: "default" | "sm";
  /** Field box, or `bare` for an inline editor. See `INPUT_VARIANT`. */
  variant?: InputVariant;
  /**
   * Trailing static text rendered inside the field — a unit ("min", "attempts")
   * or a short suffix. Purely decorative (`aria-hidden`): the accessible name
   * still comes from the field's own label, so put anything meaningful there.
   * When set, the component renders a `relative` wrapper and reserves right
   * padding for the adornment.
   */
  endAdornment?: React.ReactNode;
  /** Extra classes for the adornment wrapper (width/margin belong here). */
  wrapperClassName?: string;
}

function Input({
  className,
  type,
  size = "default",
  variant = "default",
  endAdornment,
  wrapperClassName,
  ...props
}: InputProps) {
  const field = (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-w-0 text-m3-on-surface",
        variant === "default" && INPUT_SIZE[size],
        INPUT_VARIANT[variant],
        "transition-colors outline-none",
        "placeholder:text-m3-on-surface-variant/50",
        // Same hover/focus language as the Select trigger. `bare` skips them
        // here rather than overriding in INPUT_VARIANT, which is concatenated
        // earlier and so loses the tailwind-merge race.
        variant !== "bare" &&
          "hover:border-m3-primary/70 hover:bg-m3-primary/[0.04] hover:shadow-[0_1px_2px_rgba(15,23,42,0.06)]",
        variant !== "bare" &&
          "focus-visible:border-m3-primary/60 focus-visible:bg-m3-surface focus-visible:ring-2 focus-visible:ring-m3-secondary/30",
        "aria-invalid:border-danger aria-invalid:ring-danger/20",
        "disabled:cursor-not-allowed disabled:opacity-60",
        // Number fields: the native spin buttons are visual noise at this
        // density and shift the text off-centre. Align digits instead.
        "[&[type=number]]:[appearance:textfield] [&[type=number]]:tabular-nums",
        "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        endAdornment && "pr-16",
        className,
      )}
      {...props}
    />
  );

  if (!endAdornment) return field;

  return (
    <div className={cn("relative w-full", wrapperClassName)}>
      {field}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none font-semibold text-m3-on-surface-variant",
          size === "sm" ? "text-[11px]" : "text-xs",
        )}
      >
        {endAdornment}
      </span>
    </div>
  );
}

export { Input };
