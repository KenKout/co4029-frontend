import { describe, expect, it } from "vitest";
import {
  resolveLocale,
  formatDate,
  formatDateTime,
  formatClock,
  formatDurationShort,
  formatElapsedLabel,
} from "../date";

describe("resolveLocale", () => {
  it("maps vi → vi-VN and everything else → en-US", () => {
    expect(resolveLocale("vi")).toBe("vi-VN");
    expect(resolveLocale("en")).toBe("en-US");
    expect(resolveLocale(undefined)).toBe("en-US");
    expect(resolveLocale("fr")).toBe("en-US");
  });
});

describe("formatDate (numeric date, en-US)", () => {
  it("renders em dash for empty and raw input for unparseable", () => {
    expect(formatDate(null, "en-US")).toBe("—");
    expect(formatDate(undefined, "en-US")).toBe("—");
    expect(formatDate("not-a-date", "en-US")).toBe("not-a-date");
  });
  it("formats a valid ISO date as MM/DD/YYYY in en-US", () => {
    // 2026-07-31 — assert the parts rather than a locale-exact string.
    const out = formatDate("2026-07-31T12:00:00Z", "en-US");
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/07/);
  });
});

describe("formatDateTime", () => {
  it("renders em dash for empty", () => {
    expect(formatDateTime(null, "en-US")).toBe("—");
  });
});

describe("formatClock (m:ss)", () => {
  it("renders em dash for null/undefined", () => {
    expect(formatClock(null)).toBe("—");
    expect(formatClock(undefined)).toBe("—");
  });
  it("formats seconds as m:ss with zero-padded seconds only", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(5)).toBe("0:05");
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(600)).toBe("10:00");
  });
});

describe("formatDurationShort (Xm Ys)", () => {
  it("renders em dash for null/NaN", () => {
    expect(formatDurationShort(null)).toBe("—");
    expect(formatDurationShort(Number.NaN)).toBe("—");
  });
  it("drops the minute part under a minute", () => {
    expect(formatDurationShort(0)).toBe("0s");
    expect(formatDurationShort(45)).toBe("45s");
  });
  it("shows minutes and seconds past a minute", () => {
    expect(formatDurationShort(65)).toBe("1m 5s");
    expect(formatDurationShort(600)).toBe("10m 0s");
  });
});

describe("formatElapsedLabel", () => {
  it("uses Mm SSs under an hour with zero-padded seconds", () => {
    expect(formatElapsedLabel(64)).toBe("1m 04s");
    expect(formatElapsedLabel(5)).toBe("0m 05s");
  });
  it("switches to Hh MMm past an hour with zero-padded minutes", () => {
    expect(formatElapsedLabel(3600)).toBe("1h 00m");
    expect(formatElapsedLabel(3600 + 3 * 60)).toBe("1h 03m");
  });
  it("clamps negative input to zero", () => {
    expect(formatElapsedLabel(-5)).toBe("0m 00s");
  });
});
