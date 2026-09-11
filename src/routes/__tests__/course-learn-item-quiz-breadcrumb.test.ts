import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * While a quiz attempt is IN PROGRESS the unified learn-item route must NOT
 * render the page breadcrumb above the take screen: the taking stage owns the
 * whole layout (its sticky top bar already carries a back affordance), and the
 * crumb row pushed the questions below the fold on short screens.
 *
 * The intro / result / not-found / no-questions screens keep the breadcrumb —
 * those are normal navigation contexts.
 *
 * The quiz branch is asserted against the source (rendering the whole route
 * would drag the router + every API hook into the test), the same pattern the
 * course-tab-transition test uses.
 */

const SRC = readFileSync(
  resolve(__dirname, "../courses/course-learn-item.tsx"),
  "utf8",
);

function quizBranch(): string {
  const start = SRC.indexOf('matched.item.item_type === "quiz"');
  const end = SRC.indexOf('matched.item.item_type === "interview"');
  return SRC.slice(start, end);
}

describe("quiz taking hides the breadcrumb", () => {
  it("QuizProxy receives the breadcrumb instead of it being rendered above", () => {
    const branch = quizBranch();
    expect(branch).toContain("breadcrumb={breadcrumb}");
    // Rendered-as-child form ({breadcrumb} on its own JSX line) must be gone.
    expect(branch).not.toMatch(/^\s*\{breadcrumb\}/m);
  });

  it("the in-progress branch renders QuizTakingStage without the breadcrumb", () => {
    const inner = SRC.slice(
      SRC.indexOf("function QuizProxyInner"),
      SRC.indexOf("function InterviewProxy"),
    );
    const takingBranch = inner.slice(
      inner.indexOf("if (taking &&"),
      inner.indexOf("if (submittedSummary)"),
    );
    expect(takingBranch).toContain("QuizTakingStage");
    expect(takingBranch).not.toMatch(/^\s*\{breadcrumb\}/m);
  });

  it("intro / results / no-questions still keep the breadcrumb", () => {
    const inner = SRC.slice(
      SRC.indexOf("function QuizProxyInner"),
      SRC.indexOf("function InterviewProxy"),
    );
    for (const marker of ["if (submittedSummary)", "if (!taking)", "// Taking but the live payload"]) {
      const at = inner.indexOf(marker);
      expect(at).toBeGreaterThan(-1);
      // The crumb sits inside the same return block as the screen.
      expect(inner.slice(at, at + 460)).toMatch(/^\s*\{breadcrumb\}/m);
    }
  });
});
