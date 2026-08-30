/**
 * Per-section status shown inside a {@link SectionNav} item.
 *
 * - `completed` → green text + check icon (e.g. "Completed", "8/8 approved")
 * - `warning`   → amber text + warning icon (e.g. "Not added")
 * - `info`      → neutral muted text, no icon (e.g. "8 generated")
 * - `none`      → no status affix
 *
 * Status is NEVER communicated by colour alone — every non-neutral state
 * pairs the colour with an icon and text, and carries an accessible label.
 */
export type SectionStatus =
  | { kind: "completed"; label: string; srLabel?: string }
  | { kind: "warning"; label: string; srLabel?: string }
  | { kind: "info"; label: string; srLabel?: string }
  | { kind: "none" };

export interface SectionNavItem {
  /** DOM id of the target section (without the leading `#`). */
  id: string;
  /** Visible label, e.g. "Settings". */
  label: string;
  /** Shortened label for tablet widths; falls back to `label`. */
  shortLabel?: string;
  status?: SectionStatus;
}

export interface SectionNavProps {
  items: SectionNavItem[];
  /**
   * Sticky offset from the top of the viewport in px — normally the height
   * of the global header the nav sits beneath. Also used to decide which
   * section is "active" during scroll-spy. Defaults to 64 (h-16 top bar).
   */
  topOffset?: number;
  /** Accessible label for the `<nav>` landmark. */
  ariaLabel: string;
  /**
   * Pin the nav to the top while scrolling. When false the nav scrolls away
   * with the page and carries no z-index of its own, so the sticky page
   * header and the global top bar always paint above it. Defaults to true.
   */
  sticky?: boolean;
  className?: string;
}
