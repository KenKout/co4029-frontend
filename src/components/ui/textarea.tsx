import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Grow a textarea to fit its content.
 *
 * `rows` reserves height whether or not the text needs it — a one-line
 * question in `rows={3}` leaves two empty lines under it, which is where a
 * measurable slice of the quiz editor's blank space came from (88px of box
 * for 43px of text, three fields per card).
 *
 * `scrollHeight` covers content + padding but NOT the border, so the
 * difference between `offsetHeight` and `clientHeight` is added back;
 * without it every field lands 2px short and clips its own descenders.
 */
function useAutoGrow(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  enabled: boolean,
  value: unknown,
) {
  React.useLayoutEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`;
  }, [ref, enabled, value]);
}

/**
 * Multi-line counterpart to `ui/input.tsx`, carrying the same border, radius,
 * hover and focus language. Before this existed, every page hand-rolled the
 * class string (`rounded-xl border border-m3-outline-variant/20 bg-m3-surface
 * px-3 py-2.5 …`), so textareas drifted from the inputs beside them — a
 * near-invisible /20 border, no hover feedback, and a focus ring that didn't
 * match the field above it.
 *
 * `variant` selects the surface tone so the handful of real differences stay
 * declarative instead of re-declaring the whole class string:
 *
 * * `default` — `bg-m3-surface` with the strong /60 border (the input look).
 * * `low` — `bg-m3-surface-container-low` with a /30 border (dialog fields).
 * * `lowest` — `bg-m3-surface-container-lowest` with a faint /20 border
 *   (dense card grids like the quiz/question editors).
 *
 * Anything the variants don't cover (dashed model-answer boxes, `bg-white`
 * overrides, custom padding) is passed via `className` — tailwind-merge
 * resolves the conflict against the base string.
 *
 * `mono` is the paste-target convenience (bulk enrollment / quiz import):
 * it swaps in the mono font the paste affordances always wanted. `resize`
 * defaults to `none`; a handful of fields (notes, discussion replies) want
 * vertical resize and opt in with `resize="y"`.
 *
 * No `size` token: a textarea's height comes from `rows`.
 */
type TextareaVariant = "default" | "low" | "lowest";

const TEXTAREA_VARIANT: Record<TextareaVariant, string> = {
  default: "border-m3-outline-variant/60 bg-m3-surface focus-visible:bg-m3-surface",
  low: "border-m3-outline-variant/30 bg-m3-surface-container-low",
  lowest: "border-m3-outline-variant/20 bg-m3-surface-container-lowest",
};

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  /** Surface tone. Defaults to the input look. */
  variant?: TextareaVariant;
  /** Mono font for paste-target fields (bulk enrollment, quiz import). */
  mono?: boolean;
  /** Vertical resize opt-in; the base look is `resize-none`. */
  resize?: "none" | "y";
  /**
   * Size to the content instead of to `rows`.
   *
   * `rows` then acts as the MINIMUM (via `min-height`), so a field can still
   * reserve a couple of lines while a longer answer keeps growing. Pair it
   * with `resize="none"` — a hand-dragged height and an auto-set one fight
   * each other on the next keystroke.
   */
  autoGrow?: boolean;
}

function Textarea({
  className,
  rows = 4,
  variant = "default",
  mono = false,
  resize = "none",
  autoGrow = false,
  ref,
  style,
  ...props
}: TextareaProps) {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null);
  useAutoGrow(innerRef, autoGrow, props.value);

  return (
    <textarea
      data-slot="textarea"
      ref={(node) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      rows={rows}
      // The auto-grown height is written to style.height, so `rows` would
      // otherwise stop mattering entirely; as a min-height it keeps doing the
      // one job worth keeping — reserving a sensible floor for an empty field.
      style={
        autoGrow
          ? { minHeight: `calc(${rows} * 1.625em + 1.25rem)`, ...style }
          : style
      }
      className={cn(
        "w-full min-w-0 rounded-xl px-3 py-2.5 text-sm leading-relaxed text-m3-on-surface",
        TEXTAREA_VARIANT[variant],
        "transition-colors outline-none",
        "placeholder:text-m3-on-surface-variant/50",
        "hover:border-m3-primary/70 hover:bg-m3-primary/[0.04] hover:shadow-[0_1px_2px_rgba(15,23,42,0.06)]",
        "focus-visible:border-m3-primary/60 focus-visible:ring-2 focus-visible:ring-m3-secondary/30",
        "aria-invalid:border-danger aria-invalid:ring-danger/20",
        "disabled:cursor-not-allowed disabled:bg-m3-surface-container disabled:opacity-60",
        resize === "y" ? "resize-y" : "resize-none",
        mono && "font-mono",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
