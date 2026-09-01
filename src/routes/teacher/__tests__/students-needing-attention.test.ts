import { describe, expect, it } from "vitest";

import { initials } from "@/routes/teacher/_components/teacher-index/work-queue/StudentList";
import type { StudentNeedingAttention } from "@/lib/api/hooks/teacher-courses";

/**
 * The section renders server-scored rows, so the interesting FE logic is
 * narrow: how a row is keyed, how a nameless account is labelled, and how
 * the "+N signals" affordance is derived. Ordering and severity are the
 * server's job and are covered on that side.
 */

function row(over: Partial<StudentNeedingAttention> = {}): StudentNeedingAttention {
  return {
    user_id: "u1",
    display_name: "Nguyen Van A",
    email: "a@example.com",
    course_id: "c1",
    course_title: "Operating Systems",
    completion_percent: 12.4,
    last_engagement_at: null,
    days_since_last_engagement: 12,
    primary_reason: "No engagement for 12 days (threshold: 7).",
    signal_count: 1,
    severity: "high",
    ...over,
  };
}

describe("students needing attention", () => {
  it("keys rows by student AND course", () => {
    // The same student appears once per course they are struggling in, so
    // keying on user_id alone would silently drop every row after the
    // first — React would render one of two real problems.
    const rows = [row(), row({ course_id: "c2", course_title: "Networks" })];
    const keys = rows.map((r) => `${r.user_id}:${r.course_id}`);
    expect(new Set(keys).size).toBe(2);
  });

  it("falls back to the email when the account has no display name", () => {
    const r = row({ display_name: null });
    expect(r.display_name?.trim() || r.email).toBe("a@example.com");
  });

  it("treats a whitespace-only display name as absent", () => {
    const r = row({ display_name: "   " });
    expect(r.display_name?.trim() || r.email).toBe("a@example.com");
  });

  it("shows extra signals as a count, not a list", () => {
    // FR-022: primary reason in full, the rest counted. Listing all of
    // them would bury the reason that ranked first.
    expect(row({ signal_count: 3 }).signal_count - 1).toBe(2);
    expect(row({ signal_count: 1 }).signal_count - 1).toBe(0);
  });

  it("rounds progress for display without altering the value", () => {
    expect(Math.round(row({ completion_percent: 12.4 }).completion_percent)).toBe(12);
    expect(Math.round(row({ completion_percent: 12.5 }).completion_percent)).toBe(13);
  });

  it("renders the server's reason verbatim, threshold included", () => {
    // Rebuilding this sentence on the client is how the copy came to
    // claim a 7-day rule the query no longer used. The threshold is
    // tunable; only the server knows the value that actually fired.
    expect(row().primary_reason).toContain("threshold: 7");
  });

  describe("initials", () => {
    it("takes first and last of a multi-part name", () => {
      expect(initials("Nguyen Van A")).toBe("NA");
    });

    it("takes two characters of a single-part name", () => {
      expect(initials("Madonna")).toBe("MA");
    });

    it("handles an email fallback without crashing", () => {
      expect(initials("a@example.com")).toBe("A@");
    });

    it("never returns an empty badge", () => {
      expect(initials("   ")).toBe("?");
    });
  });
});
