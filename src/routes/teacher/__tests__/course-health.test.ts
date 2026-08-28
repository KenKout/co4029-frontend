import { describe, expect, it } from "vitest";

import type { CourseHealthRow } from "@/lib/api/hooks/teacher-courses";
import {
  MIN_PASS_SAMPLE,
  atRiskShare,
  daysSince,
  hasUsablePassRate,
  nullableSortValue,
} from "@/routes/teacher/_components/teacher-index/course-health-helpers";

function row(over: Partial<CourseHealthRow> = {}): CourseHealthRow {
  return {
    course_id: "c1",
    title: "Operating Systems",
    slug: "os",
    status: "published",
    students: 40,
    avg_progress_percent: 62.5,
    at_risk_students: 4,
    pass_rate_percent: 78,
    pass_sample: 120,
    pending_review: 3,
    last_activity_at: "2026-08-20T10:00:00Z",
    severity: "medium",
    severity_reason: "4 of 40 students at risk",
    ...over,
  };
}

describe("course health", () => {
  describe("pass rate suppression", () => {
    it("withholds a rate computed from too few attempts", () => {
      // "33%" off three attempts reads as a failing course when it is one
      // student having a bad afternoon.
      expect(
        hasUsablePassRate(row({ pass_rate_percent: 33, pass_sample: 3 })),
      ).toBe(false);
    });

    it("shows the rate once the sample reaches the floor", () => {
      expect(
        hasUsablePassRate(row({ pass_sample: MIN_PASS_SAMPLE })),
      ).toBe(true);
    });

    it("withholds when there is no rate at all", () => {
      // No published quiz completed yet — not the same as everyone failing.
      expect(
        hasUsablePassRate(row({ pass_rate_percent: null, pass_sample: 0 })),
      ).toBe(false);
    });

    it("does not confuse a real 0% with missing data", () => {
      const everyoneFailed = row({ pass_rate_percent: 0, pass_sample: 50 });
      expect(hasUsablePassRate(everyoneFailed)).toBe(true);
    });
  });

  describe("sorting", () => {
    it("keeps 'no data' out of the ranked band", () => {
      // Sorting null as 0 would pile every unassessed course at the bottom
      // of an ascending sort, looking like the worst performers.
      expect(nullableSortValue(null)).toBe(-1);
      expect(nullableSortValue(0)).toBe(0);
    });

    it("ranks at-risk by share, not by raw count", () => {
      const small = row({ at_risk_students: 8, students: 20 });
      const large = row({ at_risk_students: 8, students: 200 });
      expect(atRiskShare(small)).toBeGreaterThan(atRiskShare(large));
    });

    it("survives a course with an empty roster", () => {
      // 0/0 would be NaN, which sorts unpredictably against real numbers.
      const empty = row({ at_risk_students: 0, students: 0 });
      expect(atRiskShare(empty)).toBe(0);
      expect(Number.isNaN(atRiskShare(empty))).toBe(false);
    });
  });

  describe("daysSince", () => {
    const now = new Date("2026-08-28T12:00:00Z");

    it("counts whole days elapsed", () => {
      expect(daysSince("2026-08-20T10:00:00Z", now)).toBe(8);
    });

    it("returns 0 for activity earlier today", () => {
      expect(daysSince("2026-08-28T01:00:00Z", now)).toBe(0);
    });

    it("returns null for a course that has never seen activity", () => {
      // Distinct from 0 — "never" and "today" are opposite facts.
      expect(daysSince(null, now)).toBeNull();
    });

    it("returns null rather than NaN on an unparseable timestamp", () => {
      expect(daysSince("not-a-date", now)).toBeNull();
    });
  });
});
