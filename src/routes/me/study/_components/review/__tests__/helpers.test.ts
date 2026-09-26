import { describe, expect, it } from "vitest";
import { describeReviewInterval } from "../helpers";

describe("describeReviewInterval", () => {

  it("keeps configurable short intervals in seconds", () => {
    expect(describeReviewInterval(10)).toEqual({
      unit: "seconds",
      value: 10,
    });
  });

  it("uses minutes and hours for medium intervals", () => {
    expect(describeReviewInterval(120)).toEqual({
      unit: "minutes",
      value: 2,
    });
    expect(describeReviewInterval(2 * 60 * 60)).toEqual({
      unit: "hours",
      value: 2,
    });
  });

  it("uses days for normal production intervals", () => {
    expect(describeReviewInterval(6 * 24 * 60 * 60)).toEqual({
      unit: "days",
      value: 6,
    });
  });

  it("identifies retired cards and clamps past timestamps", () => {
    expect(describeReviewInterval(null)).toEqual({ unit: "retired" });
    expect(describeReviewInterval(-30)).toEqual({
      unit: "seconds",
      value: 1,
    });
  });
});
