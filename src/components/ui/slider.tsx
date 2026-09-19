import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Range slider over a native `<input type="range">`.
 *
 * The kit had no slider, so the three screens that need one — the knowledge
 * graph node weight, the quiz pass mark, and the interview persona traits —
 * each styled a bare range input with a different track colour, a different
 * thumb size and, in two of the three, no visible focus ring at all.
 *
 * The track and thumb are styled through the vendor pseudo-elements because
 * a native range has no stylable inner element in the normal cascade;
 * `accent-color` alone cannot set the track height. `value` is reported back
 * as a number, since every call site immediately did `Number(e.target.value)`.
 */
export interface SliderProps
  extends Omit<React.ComponentProps<"input">, "type" | "onChange" | "value"> {
  value: number;
  onValueChange?: (value: number) => void;
}

function Slider({
  className,
  value,
  onValueChange,
  disabled,
  ...props
}: SliderProps) {
  return (
    <input
      type="range"
      data-slot="slider"
      value={value}
      disabled={disabled}
      onChange={(e) => onValueChange?.(Number(e.target.value))}
      className={cn(
        "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-m3-outline-variant/40",
        "accent-m3-primary outline-none",
        // Thumb: WebKit and Firefox need separate rules; neither inherits.
        "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
        "[&::-webkit-slider-thumb]:bg-m3-primary [&::-webkit-slider-thumb]:cursor-pointer",
        "[&::-webkit-slider-thumb]:shadow-[0_1px_3px_rgba(15,23,42,0.3)]",
        "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4",
        "[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full",
        "[&::-moz-range-thumb]:bg-m3-primary [&::-moz-range-thumb]:cursor-pointer",
        // The ring goes on the thumb, not the 6px track, or it is invisible.
        "focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-m3-primary/40",
        "focus-visible:[&::-moz-range-thumb]:ring-2 focus-visible:[&::-moz-range-thumb]:ring-m3-primary/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Slider };
