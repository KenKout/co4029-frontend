import { describe, expect, it } from "vitest";
import { describeReviewInterval } from "../helpers";

describe("describeReviewInterval", () => {
  const now = Date.parse("2026-09-26T12:00:00.000Z");
  const due = (seconds: number) =>
    new Date(now + seconds * 1000).toISOString();

  it("keeps configurable short intervals in seconds", () => {
    expect(describeReviewInterval(due(10), now)).toEqual({
      unit: "seconds",
      value: 10,
    });
  });

  it("uses minutes and hours for medium intervals", () => {
    expect(describeReviewInterval(due(120), now)).toEqual({
      unit: "minutes",
      value: 2,
    });
    expect(describeReviewInterval(due(2 * 60 * 60), now)).toEqual({
      unit: "hours",
      value: 2,
    });
  });

  it("uses days for normal production intervals", () => {
    expect(describeReviewInterval(due(6 * 24 * 60 * 60), now)).toEqual({
      unit: "days",
      value: 6,
    });
  });

  it("identifies retired cards and clamps past timestamps", () => {
    expect(describeReviewInterval(null, now)).toEqual({ unit: "retired" });
    expect(describeReviewInterval(due(-30), now)).toEqual({
      unit: "seconds",
      value: 1,
    });
  });
});
