import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Radio, the sibling `Checkbox` never had.
 *
 * Its absence is why four screens still render a native `<input>`: the
 * reject-reason list, the question-bank correct-option picker, the clone-depth
 * cards, and the quiz option editor whose type flips between checkbox and
 * radio with `allowMultiCorrect`. Each one restated the box styling, and none
 * of them matched `Checkbox`'s focus ring.
 *
 * Deliberately mirrors `Checkbox`: same size tokens, same accent, same ring,
 * same `onCheckedChange` shape — so a form that mixes the two does not have
 * two different affordance languages in one column.
 */
type RadioSize = "default" | "sm";

const RADIO_SIZE: Record<RadioSize, string> = {
  default: "h-4 w-4",
  sm: "h-3.5 w-3.5",
};

export interface RadioProps
  extends Omit<
    React.ComponentProps<"input">,
    "type" | "onChange" | "checked" | "size"
  > {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: RadioSize;
}

function Radio({
  className,
  checked,
  onCheckedChange,
  size = "default",
  ...props
}: RadioProps) {
  return (
    <input
      type="radio"
      data-slot="radio"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={cn(
        "shrink-0 cursor-pointer border-m3-outline-variant/50 accent-m3-primary",
        RADIO_SIZE[size],
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export interface RadioFieldProps extends RadioProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  labelClassName?: string;
  descriptionClassName?: string;
}

/**
 * A radio and its label as one row — the `CheckboxField` of radios, and
 * identical to it on purpose.
 */
function RadioField({
  label,
  description,
  className,
  labelClassName,
  descriptionClassName,
  size = "default",
  disabled,
  ...props
}: RadioFieldProps) {
  return (
    <label
      className={cn(
        "flex gap-2.5 select-none",
        description ? "items-start" : "items-center",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className,
      )}
    >
      <Radio
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

export { Radio, RadioField };
