import { describe, expect, it } from "vitest";
import { XCircle } from "lucide-react";

import {
  RESULT_HERO_ICON,
  RESULT_HERO_SUMMARY_KEY,
  RESULT_HERO_TITLE_CLASS,
  RESULT_HERO_TITLE_KEY,
  RESULT_HERO_TONE_CLASS,
} from "../constants";
import {
  HERO_ICON as HISTORY_ICON,
  HERO_TITLE_CLASS as HISTORY_TITLE_CLASS,
  HERO_TITLE_KEY as HISTORY_TITLE_KEY,
  HERO_TONE_CLASS as HISTORY_TONE_CLASS,
} from "@/routes/_components/me-interview-result/constants";
import type { ResultPhase as HistoryPhase } from "@/routes/_components/me-interview-result/types";

/**
 * How the results hero presents a FAILED verdict.
 *
 * The screen previously titled a fail "Interview completed" with a blue retry
 * arrow, on the theory that a normal fail should not feel punitive. It read as
 * ambiguous instead: the one thing the page must communicate — you did not pass
 * — was the one thing it did not say. The supportive framing belongs in the
 * summary line and the study plan, where it can be specific.
 *
 * `retry` IS the fail phase (the union has no separate "fail" member), which is
 * exactly the kind of naming that invites a regression, so these tests pin the
 * treatment by name.
 */

describe("failed verdict presentation", () => {
  it("titles a fail as failed, not completed", () => {
    expect(RESULT_HERO_TITLE_KEY.retry).toBe(
      "course_interview.results.failed",
    );
    expect(RESULT_HERO_TITLE_KEY.retry).not.toBe(
      "course_interview.results.completed",
    );
  });

  it("uses an X on red for a fail", () => {
    expect(RESULT_HERO_ICON.retry).toBe(XCircle);
    expect(RESULT_HERO_TONE_CLASS.retry).toMatch(/red|rose/);
  });

  it("colours the heading to match the badge", () => {
    // A blue "Not passed" under a red X reads as two conflicting signals.
    expect(RESULT_HERO_TITLE_CLASS.retry).toMatch(/red/);
  });

  it("keeps the supportive summary line", () => {
    // Softening lives here, not in the headline.
    expect(RESULT_HERO_SUMMARY_KEY.retry).toBe(
      "course_interview.results.fail_summary",
    );
  });

  it("keeps a pass visually distinct from a fail", () => {
    expect(RESULT_HERO_ICON.pass).not.toBe(RESULT_HERO_ICON.retry);
    expect(RESULT_HERO_TONE_CLASS.pass).toMatch(/emerald|teal/);
  });

  it("keeps a grader crash distinct from a candidate fail", () => {
    // Both are red, but an evaluation failure is NOT the candidate's failure —
    // the icon has to differ or the student reads a system error as their own.
    expect(RESULT_HERO_ICON.eval_failed).not.toBe(RESULT_HERO_ICON.retry);
    expect(RESULT_HERO_TITLE_KEY.eval_failed).not.toBe(
      RESULT_HERO_TITLE_KEY.retry,
    );
  });
});

describe("live and historical results agree", () => {
  /**
   * Two screens render the same verdict: the live results screen and the
   * read-only attempt history. They keep separate constant tables, so a change
   * to one silently desyncs the other — a fail reading "Not passed" in one
   * place and "Interview completed" in the other.
   *
   * Only the phases BOTH screens model are compared. The live union also has
   * `practice`, which has no historical counterpart; typing the list against
   * the history union is what keeps that honest instead of casting.
   */
  const shared = [
    "pass",
    "retry",
    "evaluating",
    "eval_failed",
  ] as const satisfies readonly HistoryPhase[];

  it.each(shared)("uses the same title key for %s", (phase) => {
    expect(HISTORY_TITLE_KEY[phase]).toBe(RESULT_HERO_TITLE_KEY[phase]);
  });

  it.each(shared)("uses the same badge tone for %s", (phase) => {
    expect(HISTORY_TONE_CLASS[phase]).toBe(RESULT_HERO_TONE_CLASS[phase]);
  });

  it.each(shared)("uses the same heading colour for %s", (phase) => {
    expect(HISTORY_TITLE_CLASS[phase]).toBe(RESULT_HERO_TITLE_CLASS[phase]);
  });

  it("shows the fail X on the history screen too", () => {
    expect(HISTORY_ICON.retry).toBe(XCircle);
  });
});
