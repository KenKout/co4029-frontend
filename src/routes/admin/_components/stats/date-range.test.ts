import { describe, expect, it } from "vitest";

import {
  buildMonthGrid,
  daysBetweenInclusive,
  fromIso,
  presetKeyFor,
  rangePresets,
  toIso,
  type RangeSelection,
} from "./date-range";

describe("date-range helpers", () => {
  it("toIso/fromIso round-trip local dates", () => {
    const d = new Date(2026, 7, 29); // Aug 29 2026 local
    expect(toIso(d)).toBe("2026-08-29");
    expect(fromIso("2026-08-29").getDate()).toBe(29);
    expect(fromIso("2026-08-29").getMonth()).toBe(7);
  });

  it("daysBetweenInclusive counts both edges", () => {
    expect(daysBetweenInclusive("2026-08-01", "2026-08-29")).toBe(29);
    expect(daysBetweenInclusive("2026-08-29", "2026-08-29")).toBe(1);
    expect(daysBetweenInclusive("2025-12-31", "2026-01-01")).toBe(2);
  });

  it("presets anchor on the reference date", () => {
    const presets = rangePresets(new Date(2026, 7, 29)); // Aug 29 2026
    expect(presets.today).toEqual({ from: "2026-08-29", to: "2026-08-29" });
    expect(presets.yesterday).toEqual({ from: "2026-08-28", to: "2026-08-28" });
    expect(presets.last7).toEqual({ from: "2026-08-23", to: "2026-08-29" });
    expect(presets.last30).toEqual({ from: "2026-07-31", to: "2026-08-29" });
    // This month: Aug 1 -> Aug 29 (local); last month: full July.
    expect(presets.thisMonth).toEqual({ from: "2026-08-01", to: "2026-08-29" });
    expect(presets.lastMonth).toEqual({ from: "2026-07-01", to: "2026-07-31" });
  });

  it("lastMonth rolls over the year boundary", () => {
    const presets = rangePresets(new Date(2026, 0, 15)); // Jan 2026
    expect(presets.lastMonth).toEqual({ from: "2025-12-01", to: "2025-12-31" });
  });

  it("presetKeyFor matches exact ranges, null for custom", () => {
    const presets = rangePresets(new Date(2026, 7, 29));
    expect(presetKeyFor(presets.last7, presets)).toBe("last7");
    expect(presetKeyFor(presets.thisMonth, presets)).toBe("thisMonth");
    const custom: RangeSelection = { from: "2026-08-10", to: "2026-08-29" };
    expect(presetKeyFor(custom, presets)).toBeNull();
  });

  it("buildMonthGrid pads to 42 cells around the month", () => {
    // August 2026 starts on a Saturday (2026-08-01).
    const grid = buildMonthGrid(2026, 7);
    expect(grid).toHaveLength(42);
    expect(grid.filter(Boolean)).toHaveLength(31);
    // The 1st lands on the 6th cell (0 = Sunday... Aug 1 2026 is Saturday).
    expect(grid.indexOf("2026-08-01")).toBe(6);
    expect(grid[5]).toBeNull();
  });
});