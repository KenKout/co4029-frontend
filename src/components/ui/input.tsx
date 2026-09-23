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
 * `md` sits between them. The scale used to stop at 40px and 28px, and eleven
 * call sites reached past it with `className="h-9"` to height-match a
 * neighbouring control — a gap in the scale, not eleven mistakes.
 *
 * Every token is an explicit `h-*` (not vertical padding) so that a call site
 * which must height-match something unusual can still override with
 * `className="h-12"` and have `tailwind-merge` actually drop the token — a
 * `py-*` token would survive the merge and fight the height.
 */
type InputSize = "default" | "md" | "sm";

const INPUT_SIZE: Record<InputSize, string> = {
  default: "h-10 rounded-xl px-3 text-sm",
  md: "h-9 rounded-lg px-3 text-sm",
  sm: "h-7 rounded-md px-2.5 text-xs",
};

/**
 * Surface tone, the same vocabulary `Textarea` already uses, so a text field
 * and the multi-line field under it agree about what surface they sit on.
 * Input previously had no tone at all, which is why call sites reached for
 * `bg-card`, `bg-white`, `ghost-border` and `bg-m3-surface-container-lowest`
 * by hand and drifted apart from their own textareas.
 *
 * * `default` — `bg-m3-surface` with the strong /60 border (the field look).
 * * `low` — `bg-m3-surface-container-low` with a /30 border (dialog fields).
 * * `lowest` — `bg-m3-surface-container-lowest` with a faint /20 border
 *   (dense card grids like the quiz/question editors).
 * * `bare` — no box at all: the inline-editor escape hatch for a
 *   click-to-edit title, a tag composer inside a chip row, an option row
 *   inside a question card. Those are not form fields and want none of the
 *   height, radius, border or hover/focus chrome, but should still inherit
 *   placeholder, disabled, aria-invalid and number-spinner behaviour.
 */
type InputVariant = "default" | "low" | "lowest" | "bare";

const INPUT_VARIANT: Record<InputVariant, string> = {
  // No height in any of these: that is INPUT_SIZE's job, and this string is
  // concatenated after it, so an `h-*` token would silently beat `size="sm"`.
  default:
    "border border-m3-outline-variant/60 bg-m3-surface " +
    "disabled:bg-m3-surface-container",
  low:
    "border border-m3-outline-variant/30 bg-m3-surface-container-low " +
    "disabled:bg-m3-surface-container",
  lowest:
    "border border-m3-outline-variant/20 bg-m3-surface-container-lowest " +
    "disabled:bg-m3-surface-container",
  bare: "border-0 bg-transparent p-0 text-sm",
};

/** Adornment type scale, kept in step with the field's own density. */
const ADORNMENT_TEXT: Record<InputSize, string> = {
  default: "text-xs",
  md: "text-xs",
  sm: "text-[11px]",
};

/**
 * Padding reserved for an adornment. A leading icon needs less room than a
 * trailing unit word, and both shrink with the field.
 */
const START_PAD: Record<InputSize, string> = {
  default: "pl-9",
  md: "pl-9",
  sm: "pl-8",
};

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size"> {
  /**
   * Density token. Shadows the native numeric `size` attribute (which nothing
   * in this app uses — width comes from Tailwind) hence the `Omit` above.
   */
  size?: InputSize;
  /** Surface tone, or `bare` for an inline editor. See `INPUT_VARIANT`. */
  variant?: InputVariant;
  /**
   * Mono font for fields holding a code, id, slug or token — the counterpart
   * to `Textarea`'s `mono`. Ten call sites were passing `font-mono` by hand
   * before this existed.
   */
  mono?: boolean;
  /**
   * Leading icon or short static prefix rendered inside the field, mirroring
   * `endAdornment`. Decorative (`aria-hidden`): the accessible name still
   * comes from the field's label. `SearchInput` is this plus a magnifier.
   */
  startAdornment?: React.ReactNode;
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

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    type,
    size = "default",
    variant = "default",
    mono = false,
    startAdornment,
    endAdornment,
    wrapperClassName,
    ...props
  },
  ref,
) {
  const bare = variant === "bare";
  const field = (
    <InputPrimitive
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-w-0 text-m3-on-surface",
        !bare && INPUT_SIZE[size],
        INPUT_VARIANT[variant],
        "transition-colors outline-none",
        "placeholder:text-m3-on-surface-variant/50",
        // Same hover/focus language as the Select trigger. `bare` skips them
        // here rather than overriding in INPUT_VARIANT, which is concatenated
        // earlier and so loses the tailwind-merge race.
        !bare &&
          "hover:border-m3-primary/70 hover:bg-m3-primary/[0.04] hover:shadow-[0_1px_2px_rgba(15,23,42,0.06)]",
        !bare &&
          "focus-visible:border-m3-primary/60 focus-visible:bg-m3-surface focus-visible:ring-2 focus-visible:ring-m3-secondary/30",
        "aria-invalid:border-danger aria-invalid:ring-danger/20",
        "disabled:cursor-not-allowed disabled:opacity-60",
        // Number fields: the native spin buttons are visual noise at this
        // density and shift the text off-centre. Align digits instead.
        "[&[type=number]]:[appearance:textfield] [&[type=number]]:tabular-nums",
        "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        mono && "font-mono",
        startAdornment && START_PAD[size],
        endAdornment && "pr-16",
        className,
      )}
      {...props}
    />
  );

  if (!startAdornment && !endAdornment) return field;

  return (
    <div className={cn("relative w-full", wrapperClassName)}>
      {startAdornment && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex select-none items-center text-m3-on-surface-variant",
            ADORNMENT_TEXT[size],
            "[&_svg]:h-4 [&_svg]:w-4",
          )}
        >
          {startAdornment}
        </span>
      )}
      {field}
      {endAdornment && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none font-semibold text-m3-on-surface-variant",
            ADORNMENT_TEXT[size],
          )}
        >
          {endAdornment}
        </span>
      )}
    </div>
  );
});

export { Input };
