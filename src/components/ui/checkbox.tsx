import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.ComponentProps<"input">, "type" | "onChange" | "checked"> {
  checked?: boolean;
  /** Tri-state: renders the dash glyph. Ignored while `checked` is true. */
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * Minimal accessible checkbox over a native `<input type="checkbox">`.
 * Supports the indeterminate ("some selected") state that select-all
 * headers need — set via a ref since it isn't an HTML attribute.
 */
function Checkbox({
  className,
  checked,
  indeterminate,
  onCheckedChange,
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
        "h-4 w-4 shrink-0 cursor-pointer rounded border-m3-outline-variant/50 accent-m3-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Checkbox };
