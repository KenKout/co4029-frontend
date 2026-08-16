import { describe, expect, it } from "vitest";

import type { Notification } from "@/lib/api/types";

import {
  CATEGORY_ORDER,
  dateBucketFor,
  filterNotifications,
  groupNotifications,
  isCategoryKey,
  sinceFromTimeRange,
} from "../helpers";

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    user_id: "u1",
    title: "Quiz ready",
    body: "Your quiz is ready to take.",
    category: "quiz_generation",
    entity_type: "quiz",
    entity_id: "q1",
    action_url: null,
    scheduled_for: null,
    delivered_at: null,
    read_at: null,
    delivery_status: "delivered",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("sinceFromTimeRange", () => {
  it("returns the epoch for all", () => {
    expect(sinceFromTimeRange("all")).toBe("1970-01-01T00:00:00.000Z");
  });

  it("returns midnight today for today", () => {
    const out = sinceFromTimeRange("today");
    const d = new Date(out);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });

  it("returns a rolling 7-day window for week", () => {
    const out = sinceFromTimeRange("week");
    const age = Date.now() - new Date(out).getTime();
    // 7 days ± a couple seconds of slack
    expect(age).toBeGreaterThan(7 * 86_400_000 - 5000);
    expect(age).toBeLessThan(7 * 86_400_000 + 5000);
  });
});

describe("filterNotifications", () => {
  const now = new Date();
  const old = new Date(now);
  old.setDate(old.getDate() - 10);
  const recent = new Date(now);
  recent.setDate(recent.getDate() - 1);

  const items = [
    makeNotification({
      id: "a",
      title: "Quiz ready",
      body: "Take it now",
      category: "quiz_generation",
      read_at: null,
      created_at: recent.toISOString(),
    }),
    makeNotification({
      id: "b",
      title: "New lesson",
      body: "Lesson 3 unlocked",
      category: "lesson_unlock",
      read_at: now.toISOString(),
      created_at: now.toISOString(),
    }),
    makeNotification({
      id: "c",
      title: "Old system note",
      body: "Routine maintenance",
      category: "system",
      read_at: null,
      created_at: old.toISOString(),
    }),
  ];

  it("search matches title or body, case-insensitive", () => {
    expect(filterNotifications(items, { search: "LESSON" }).map((n) => n.id)).toEqual(["b"]);
    expect(filterNotifications(items, { search: "take it" }).map((n) => n.id)).toEqual(["a"]);
    expect(filterNotifications(items, { search: "nothing" })).toEqual([]);
  });

  it("time range cuts off older items", () => {
    expect(filterNotifications(items, { timeRange: "week" }).map((n) => n.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("status unread keeps only unread", () => {
    expect(filterNotifications(items, { status: "unread" }).map((n) => n.id)).toEqual(["a", "c"]);
  });

  it("status read keeps only read", () => {
    expect(filterNotifications(items, { status: "read" }).map((n) => n.id)).toEqual(["b"]);
  });

  it("category filters exactly", () => {
    expect(filterNotifications(items, { category: "system" }).map((n) => n.id)).toEqual(["c"]);
  });

  it("all filters AND together", () => {
    expect(
      filterNotifications(items, { search: "lesson", status: "read" }).map((n) => n.id),
    ).toEqual(["b"]);
  });
});

describe("dateBucketFor", () => {
  // Fixed "now" so the test is deterministic.
  const now = new Date("2026-08-04T15:00:00Z");

  it("buckets today", () => {
    expect(dateBucketFor("2026-08-04T08:00:00Z", now)).toBe("today");
  });

  it("buckets yesterday", () => {
    expect(dateBucketFor("2026-08-03T23:00:00Z", now)).toBe("yesterday");
  });

  it("buckets this week (within 6 days back)", () => {
    expect(dateBucketFor("2026-07-30T10:00:00Z", now)).toBe("this_week");
  });

  it("buckets earlier beyond the week", () => {
    expect(dateBucketFor("2026-07-20T10:00:00Z", now)).toBe("earlier");
  });
});

describe("groupNotifications", () => {
  // Dates are relative to real "now" — hardcoded absolute dates made this
  // suite a time-bomb that started failing the moment the calendar passed
  // them (a notification "today" from last week buckets as this_week).
  const now = new Date();
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeek = new Date(now);
  thisWeek.setDate(thisWeek.getDate() - 3);
  const earlier = new Date(now);
  earlier.setDate(earlier.getDate() - 30);

  const items = [
    makeNotification({
      id: "a",
      category: "quiz_generation",
      created_at: today.toISOString(),
    }),
    makeNotification({
      id: "b",
      category: "lesson_unlock",
      created_at: yesterday.toISOString(),
    }),
    makeNotification({
      id: "c",
      category: "quiz_generation",
      created_at: thisWeek.toISOString(),
    }),
    makeNotification({
      id: "d",
      category: "system",
      created_at: earlier.toISOString(),
    }),
  ];

  it("groups by date in fixed bucket order, preserving input order within", () => {
    const groups = groupNotifications(items, "date");
    expect(groups.map((g) => g.key)).toEqual(["today", "yesterday", "this_week", "earlier"]);
    // today: only a; yesterday: only b; this_week: c; earlier: d
    expect(groups[0].items.map((n) => n.id)).toEqual(["a"]);
    expect(groups[1].items.map((n) => n.id)).toEqual(["b"]);
    expect(groups[2].items.map((n) => n.id)).toEqual(["c"]);
    expect(groups[3].items.map((n) => n.id)).toEqual(["d"]);
  });

  it("groups by type in canonical category order", () => {
    const groups = groupNotifications(items, "type");
    expect(groups.map((g) => g.key)).toEqual([
      "lesson_unlock",
      "system",
      "quiz_generation",
    ]);
    // quiz_generation holds a then c (input order preserved)
    expect(groups[2].items.map((n) => n.id)).toEqual(["a", "c"]);
  });

  it("CATEGORY_ORDER covers every notification category literal", () => {
    const literals = [
      "spaced_repetition",
      "lesson_unlock",
      "interview_result",
      "course_announcement",
      "system",
      "material_processing",
      "quiz_generation",
      "interview_generation",
    ];
    for (const lit of literals) {
      expect(CATEGORY_ORDER).toContain(lit);
    }
  });

  it("isCategoryKey tells category groups apart from date buckets", () => {
    expect(isCategoryKey("spaced_repetition")).toBe(true);
    expect(isCategoryKey("quiz_generation")).toBe(true);
    expect(isCategoryKey("today")).toBe(false);
    expect(isCategoryKey("this_week")).toBe(false);
    expect(isCategoryKey("nonsense_key")).toBe(false);
  });
});
