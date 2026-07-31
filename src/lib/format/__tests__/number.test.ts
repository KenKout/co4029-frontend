import { describe, expect, it } from "vitest";
import {
  formatCount,
  formatUsd,
  fmtPercent,
  fmtPercentScaled,
} from "../number";

describe("formatCount", () => {
  it("renders em dash for null/undefined", () => {
    expect(formatCount(null, "en-US")).toBe("—");
    expect(formatCount(undefined, "en-US")).toBe("—");
  });
  it("groups thousands", () => {
    expect(formatCount(1234567, "en-US")).toBe("1,234,567");
    expect(formatCount(0, "en-US")).toBe("0");
  });
});

describe("formatUsd", () => {
  it("renders em dash for null/undefined", () => {
    expect(formatUsd(null, "en-US")).toBe("—");
  });
  it("adaptive fraction digits: 2 under 10, 0 at/above", () => {
    expect(formatUsd(3.5, "en-US")).toBe("$3.50");
    expect(formatUsd(1234, "en-US")).toBe("$1,234");
  });
  it("honours an explicit maximumFractionDigits override", () => {
    expect(formatUsd(0.1234, "en-US", 4)).toBe("$0.1234");
  });
});

describe("fmtPercent (0..100, whole-or-1-decimal)", () => {
  it("renders em dash for null/undefined/NaN", () => {
    expect(fmtPercent(null)).toBe("—");
    expect(fmtPercent(undefined)).toBe("—");
    expect(fmtPercent(Number.NaN)).toBe("—");
  });
  it("drops the decimal when whole, keeps one otherwise", () => {
    expect(fmtPercent(87)).toBe("87%");
    expect(fmtPercent(87.5)).toBe("87.5%");
    expect(fmtPercent(87.44)).toBe("87.4%");
  });
});

describe("fmtPercentScaled (0..1 → whole %)", () => {
  it("renders em dash for null/undefined", () => {
    expect(fmtPercentScaled(null)).toBe("—");
    expect(fmtPercentScaled(undefined)).toBe("—");
  });
  it("scales a ratio to a whole-number percent", () => {
    expect(fmtPercentScaled(0.87)).toBe("87%");
    expect(fmtPercentScaled(0.5)).toBe("50%");
    expect(fmtPercentScaled(1)).toBe("100%");
  });
});
