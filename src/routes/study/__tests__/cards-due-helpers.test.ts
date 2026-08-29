import { describe, expect, it } from "vitest";

import type { CardDue } from "@/lib/api/types";

import {
  classifyDue,
  groupByCourse,
  SEVERE_OVERDUE_DAYS,
  sessionSize,
  SESSION_CARD_LIMIT,
  startOfLocalDay,
  summarizeBacklog,
} from "@/routes/study/_components/cards-due/helpers";

const HOUR = 3_600_000;

/** ISO for a moment `hoursAgo` hours before now. */
function ago(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * HOUR).toISOString();
}

function card(over: Partial<CardDue> = {}): CardDue {
  return {
    question_id: "q",
    quiz_id: "qz",
    lesson_id: "l",
    lesson_title: "Lesson",
    course_slug: "c",
    course_title: "Course",
    due_at: ago(1),
    last_q: null,
    ef: 2.5,
    ...over,
  };
}

describe("classifyDue", () => {
  it("treats cards due within the current local day as 'today'", () => {
    expect(classifyDue(ago(1))).toBe("today");
  });

  it("classifies past-day-but-recent cards as 'overdue'", () => {
    // ~36h ago is before local midnight but inside the severe window.
    expect(classifyDue(ago(36))).toBe("overdue");
  });

  it("classifies cards past the severe window as 'severe'", () => {
    const severeAgo = (SEVERE_OVERDUE_DAYS + 1) * 24;
    expect(classifyDue(ago(severeAgo))).toBe("severe");
  });

  it("keeps exactly-seven-days-old cards as plain overdue", () => {
    expect(classifyDue(ago(SEVERE_OVERDUE_DAYS * 24))).toBe("overdue");
  });
});

describe("startOfLocalDay", () => {
  it("returns the local midnight timestamp", () => {
    const now = new Date("2026-08-29T10:30:00");
    const midnight = new Date(startOfLocalDay(now));
    expect(midnight.getHours()).toBe(0);
    expect(midnight.getMinutes()).toBe(0);
    expect(midnight.getDate()).toBe(now.getDate());
  });
});

describe("groupByCourse", () => {
  it("aggregates counts, overdue subsets and severity per bucket", () => {
    const items = [
      card({ lesson_id: "l1", lesson_title: "A", course_slug: "os", course_title: "OS", due_at: ago(1) }),
      card({ lesson_id: "l1", lesson_title: "A", course_slug: "os", course_title: "OS", due_at: ago(36) }),
      card({ lesson_id: "l2", lesson_title: "B", course_slug: "os", course_title: "OS", due_at: ago(10 * 24) }),
      card({ lesson_id: "l3", lesson_title: "C", course_slug: "dn", course_title: "DN", due_at: ago(2) }),
    ];
    const groups = groupByCourse(items);

    expect(groups).toHaveLength(2);
    const os = groups.find((g) => g.courseSlug === "os")!;
    expect(os.count).toBe(3);
    expect(os.overdue).toBe(2); // 36h + 10d, not the 1h one
    expect(os.severe).toBe(1); // only the 10-day card
    expect(os.lessons.map((l) => l.lessonId)).toEqual(["l1", "l2"]); // count desc
    expect(os.lessons[0].overdue).toBe(1);
    expect(os.lessons[1].severe).toBe(1);
  });

  it("sorts courses by count descending", () => {
    const groups = groupByCourse([
      card({ course_slug: "small", lesson_id: "a" }),
      card({ course_slug: "big", lesson_id: "b", lesson_title: "B" }),
      card({ course_slug: "big", lesson_id: "b", lesson_title: "B" }),
    ]);
    expect(groups.map((g) => g.courseSlug)).toEqual(["big", "small"]);
  });
});

describe("summarizeBacklog", () => {
  it("splits overdue / severe / due-today from the flat list", () => {
    const s = summarizeBacklog([
      card({ due_at: ago(1) }),
      card({ due_at: ago(20) }),
      card({ due_at: ago(10 * 24) }),
    ]);
    expect(s.total).toBe(3);
    expect(s.overdue).toBe(2);
    expect(s.severe).toBe(1);
    expect(s.dueToday).toBe(1);
  });
});

describe("sessionSize", () => {
  it("caps the session at SESSION_CARD_LIMIT", () => {
    expect(SESSION_CARD_LIMIT).toBe(20);
    expect(sessionSize(31)).toBe(20);
    expect(sessionSize(20)).toBe(20);
    expect(sessionSize(7)).toBe(7);
    expect(sessionSize(0)).toBe(0);
  });
});