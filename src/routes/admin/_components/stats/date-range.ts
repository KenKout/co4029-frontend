/**
 * Date-range primitives for the dashboard's custom time picker.
 *
 * Ranges are stored as ``YYYY-MM-DD`` strings in the BROWSER'S local timezone
 * and the server treats them as calendar dates (a range of Aug 1 - Aug 29 is
 * inclusive of both edges). All math here is pure so the picker and its
 * presets stay unit-testable without a DOM.
 */

export type RangeSelection = { from: string; to: string };

export type RangePresetKey =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth";

/** Local-date ``YYYY-MM-DD`` for a Date. */
export function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a local ``YYYY-MM-DD`` back into a Date at local midnight. */
export function fromIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

/** Inclusive number of days in ``[from, to]`` (1 for a single-day range). */
export function daysBetweenInclusive(from: string, to: string): number {
  const ms = fromIso(to).getTime() - fromIso(from).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

/** All presets, anchored at ``reference`` (normally today, local). */
export function rangePresets(reference: Date): Record<RangePresetKey, RangeSelection> {
  const today = toIso(reference);
  const yesterday = toIso(addDays(reference, -1));
  const monthStart = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const lastMonthEnd = addDays(monthStart, -1);
  const lastMonthStart = new Date(
    lastMonthEnd.getFullYear(),
    lastMonthEnd.getMonth(),
    1,
  );
  return {
    today: { from: today, to: today },
    yesterday: { from: yesterday, to: yesterday },
    last7: { from: toIso(addDays(reference, -6)), to: today },
    last30: { from: toIso(addDays(reference, -29)), to: today },
    thisMonth: { from: toIso(monthStart), to: today },
    lastMonth: {
      from: toIso(lastMonthStart),
      to: toIso(lastMonthEnd),
    },
  };
}

/** Which exact preset a selection matches, or null (custom range). */
export function presetKeyFor(
  range: RangeSelection,
  presets: Record<RangePresetKey, RangeSelection>,
): RangePresetKey | null {
  for (const key of Object.keys(presets) as RangePresetKey[]) {
    if (presets[key].from === range.from && presets[key].to === range.to) {
      return key;
    }
  }
  return null;
}

/** Sunday-first 42-cell grid for one month; null cells are outside it. */
export function buildMonthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay(); // 0 = Sunday
  const grid: (string | null)[] = [];
  const cursor = addDays(first, -startOffset);
  for (let i = 0; i < 42; i += 1) {
    grid.push(cursor.getMonth() === month ? toIso(cursor) : null);
    cursor.setDate(cursor.getDate() + 1);
  }
  return grid;
}