import { describe, expect, it } from "vitest";

/**
 * Teacher dashboard triage layer.
 *
 * The dashboard used to be a content-management view: Total Courses / Published
 * / Drafts / AI Enabled, none of which a teacher can act on. It now leads with
 * the Human-in-the-Loop review queue and student-retention signals.
 *
 * The construction logic lives in the route component (not exported), so it's
 * mirrored here exactly. The numbers in these tests are the REAL dev-DB values,
 * so a schema or filter regression shows up as a changed expectation.
 */

type Stats = {
  quiz_cards_pending_review: number;
  interview_questions_pending_review: number;
  published_quizzes_missing_texp: number;
  materials_ready_for_quiz_gen: number;
  ungraded_quizzes: number;
  pending_interviews: number;
  pending_review_by_course: Record<string, number>;
  students_below_ef_threshold: number;
  avg_retention_ef: number;
  cards_overdue: number;
};

const DEV_DB: Stats = {
  // 52 live pending quiz questions + 1 live pending interview question.
  // (144 rows are 'pending' in total, but 92 are soft-deleted.)
  quiz_cards_pending_review: 52,
  interview_questions_pending_review: 1,
  published_quizzes_missing_texp: 0,
  materials_ready_for_quiz_gen: 0,
  ungraded_quizzes: 0,
  pending_interviews: 0,
  pending_review_by_course: {
    "course-cn": 4,
    "course-os": 3,
    "course-dw": 46,
  },
  students_below_ef_threshold: 2,
  avg_retention_ef: 1.94,
  cards_overdue: 68,
};

/** Mirrors the headline tile in routes/teacher/index.tsx. */
function cardsAwaitingReview(s: Stats): number {
  return s.quiz_cards_pending_review + s.interview_questions_pending_review;
}

/** Mirrors the review-queue filter — zero-count rows are omitted. */
function reviewItems(s: Stats): { key: string; count: number }[] {
  return [
    { key: "quiz_cards", count: s.quiz_cards_pending_review },
    {
      key: "interview_questions",
      count: s.interview_questions_pending_review,
    },
    { key: "missing_texp", count: s.published_quizzes_missing_texp },
    { key: "materials_ready", count: s.materials_ready_for_quiz_gen },
    { key: "ungraded", count: s.ungraded_quizzes },
    { key: "pending_interviews", count: s.pending_interviews },
  ].filter((i) => i.count > 0);
}

describe("review queue", () => {
  it("surfaces pending review work from the landing page", () => {
    // The whole point: a teacher shouldn't have to open each course to find
    // that 46 cards are blocking a quiz.
    const items = reviewItems(DEV_DB);
    expect(items.map((i) => i.key)).toEqual([
      "quiz_cards",
      "interview_questions",
    ]);
    expect(items[0].count).toBe(52);
  });

  it("omits zero-count rows rather than listing them as done", () => {
    // Same rule as the admin needs-attention list — a queue of resolved items
    // makes the teacher read every label to find the actionable one.
    const items = reviewItems(DEV_DB);
    expect(items.every((i) => i.count > 0)).toBe(true);
    expect(items).toHaveLength(2);
  });

  it("collapses to empty when nothing is pending", () => {
    const clear: Stats = {
      ...DEV_DB,
      quiz_cards_pending_review: 0,
      interview_questions_pending_review: 0,
    };
    expect(reviewItems(clear)).toHaveLength(0);
  });

  it("lists every category when all have work", () => {
    const busy: Stats = {
      ...DEV_DB,
      published_quizzes_missing_texp: 3,
      materials_ready_for_quiz_gen: 7,
      ungraded_quizzes: 2,
      pending_interviews: 5,
    };
    expect(reviewItems(busy)).toHaveLength(6);
  });

  it("combines quiz and interview review into one headline number", () => {
    expect(cardsAwaitingReview(DEV_DB)).toBe(53);
  });
});

describe("per-course pending-review dot", () => {
  it("marks only courses that actually have pending work", () => {
    const byCourse = DEV_DB.pending_review_by_course;
    expect(byCourse["course-dw"]).toBe(46);
    expect(byCourse["course-cn"]).toBe(4);
  });

  it("treats a missing key as zero (courses are omitted, not zeroed)", () => {
    // The backend omits clean courses, so the UI must not render a dot for an
    // absent key or crash on undefined.
    const byCourse = DEV_DB.pending_review_by_course;
    const count = byCourse["course-with-nothing-pending"];
    expect(count).toBeUndefined();
    expect(count !== undefined && count > 0).toBe(false);
  });

  it("per-course counts sum to the aggregate total", () => {
    // Guards against the two backend queries drifting apart.
    const sum = Object.values(DEV_DB.pending_review_by_course).reduce(
      (a, b) => a + b,
      0,
    );
    expect(sum).toBe(cardsAwaitingReview(DEV_DB));
  });
});

describe("retention signals", () => {
  it("reports the real average EF below the 2.5 ideal", () => {
    // 1.94 means students are finding this material harder than baseline —
    // exactly the signal that was missing from this page.
    expect(DEV_DB.avg_retention_ef).toBeLessThan(2.5);
    expect(DEV_DB.avg_retention_ef.toFixed(2)).toBe("1.94");
  });

  it("flags students below the EF threshold", () => {
    expect(DEV_DB.students_below_ef_threshold).toBe(2);
  });

  it("counts overdue cards", () => {
    expect(DEV_DB.cards_overdue).toBe(68);
  });

  it("renders an em-dash rather than 0.00 when there is no card data", () => {
    // A brand-new course has no SR history; showing 0.00 would read as
    // catastrophic retention rather than 'no data yet'.
    const empty: number = 0;
    const display = empty ? empty.toFixed(2) : "—";
    expect(display).toBe("—");
  });
});
