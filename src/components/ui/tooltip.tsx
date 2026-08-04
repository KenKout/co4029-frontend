import * as React from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { cn } from "@/lib/utils";

export interface TooltipProps {
  /** Content shown inside the popup (text or node). */
  content: React.ReactNode;
  /** The element that opens the tooltip on hover/focus. */
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  className?: string;
}

/**
 * Text label revealed on hover/focus, built on @base-ui/react/tooltip — the
 * same primitive family as Select and ConfirmDialog, so focus handling,
 * positioning and ARIA come from the library rather than a hand-rolled
 * `title` attribute or CSS hover.
 *
 * The trigger renders whatever element is passed as `children` (via Base UI's
 * `render` prop), merging its own pointer/focus handlers and ARIA onto it.
 * Callers pass a real `<Button>`/`<button>` and keep their own `onClick` /
 * `aria-label`; the tooltip is purely an affordance layer.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  sideOffset = 6,
  className,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset} align="center">
          <TooltipPrimitive.Popup
            className={cn(
              // M3 inverse surface: dark chip on every theme, readable over any
              // row background (tooltips never sit on a controlled surface).
              "z-50 max-w-[16rem] rounded-md bg-m3-inverse-surface px-2 py-1 text-xs font-medium text-m3-inverse-on-surface shadow-lg",
              // Enter/exit: opacity+transform only → compositor-only, no reflow.
              "transition-[opacity,transform] duration-150 ease-out",
              "data-starting-style:scale-95 data-starting-style:opacity-0",
              "data-ending-style:scale-95 data-ending-style:opacity-0",
              className,
            )}
          >
            {content}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
