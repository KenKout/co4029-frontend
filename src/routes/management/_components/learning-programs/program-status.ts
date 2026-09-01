/**
 * Status presentation for a learning program, shared by the card and the
 * table so the two views cannot drift into different colours for the same
 * state.
 */

/** Badge tokens: published green, draft amber, archived grey. */
export const PROGRAM_STATUS_TOKENS = {
  draft: "bg-amber-100 text-amber-700",
  published: "bg-emerald-100 text-emerald-700",
  archived: "bg-slate-100 text-slate-500",
};

/**
 * The card's left rail. Solid, saturated versions of the badge colours —
 * the rail is the card's only large area of colour, so it carries the
 * status at a glance across a grid.
 */
export const STATUS_RAIL: Record<string, string> = {
  draft: "bg-amber-400",
  published: "bg-emerald-500",
  archived: "bg-slate-300",
};
