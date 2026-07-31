import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "@/lib/utils";

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  id?: string;
  className?: string;
  "aria-label"?: string;
}

/**
 * Accessible on/off switch over base-ui's Switch. Used where a boolean is a
 * live toggle (not a form checkbox) — the thumb slides and the track fills
 * with the primary colour when on. Sits in the same control column as numeric
 * inputs so a row's right edge stays a clean line.
 */
function Switch({
  checked,
  defaultChecked,
  disabled,
  onCheckedChange,
  id,
  className,
  "aria-label": ariaLabel,
}: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      id={id}
      checked={checked}
      defaultChecked={defaultChecked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-transparent p-0.5 transition-colors outline-none",
        "bg-slate-300 data-[checked]:bg-m3-primary",
        "focus-visible:ring-2 focus-visible:ring-m3-primary/40 focus-visible:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          "translate-x-0 data-[checked]:translate-x-4",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
