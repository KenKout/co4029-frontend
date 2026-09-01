import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Regression tests for the teacher drill-down back targets.
 *
 * Reported symptom: open a quiz from the course page, press Back, and you land
 * on a page you never visited (the module page, whose own settings sidebar
 * reads as "the config page") instead of the course you came from.
 *
 * Root cause: quizzes and lessons are opened from the COURSE page's curriculum
 * accordion (`ModuleItemRowTitle` links straight to the editor), but the
 * editors' back controls targeted `/teacher/courses/$courseId/modules/
 * $moduleId` — the owning module page, which is not on the path the teacher
 * took. The lesson editor was worse: its label already said "back to course"
 * while it navigated to the module.
 *
 * Fix: every back affordance on the quiz and lesson editors targets
 * `/teacher/courses/$courseId`. The module stays reachable via the breadcrumb.
 */

function read(rel: string): string {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

const QUIZ_HEADER = read(
  "quiz/_components/quiz-manage/QuizManageHeader.tsx",
);
const QUIZ_ACTIONS = read("quiz/_components/quiz-manage/actions.ts");
const LESSON_BACK_LINK = read("_components/lesson-manage/LessonBackLink.tsx");
const LESSON_ACTIONS = read(
  "_components/lesson-manage/use-lesson-manage-actions.ts",
);

/** The back control markup, excluding the breadcrumb trail above it. */
function backControlOf(src: string): string {
  const start = src.indexOf('<div className="flex flex-col gap-4 lg:flex-row');
  return src.slice(start, src.indexOf("</Link>", start));
}

describe("quiz editor back target", () => {
  it("the header back arrow goes to the course, not the module", () => {
    const control = backControlOf(QUIZ_HEADER);
    expect(control).toContain('to="/teacher/courses/$courseId"');
    expect(control).not.toContain("modules/$moduleId");
  });

  it("the back arrow is labelled back-to-course", () => {
    expect(backControlOf(QUIZ_HEADER)).toContain(
      "teacher_common.back_to_course",
    );
  });

  it("the module is still reachable from the breadcrumb", () => {
    // Only the back ARROW changed — losing the module crumb would strand the
    // teacher the other way round.
    const crumbs = QUIZ_HEADER.slice(0, QUIZ_HEADER.indexOf("</Breadcrumbs>"));
    expect(crumbs).toContain(
      '"/teacher/courses/$courseId/modules/$moduleId"',
    );
  });

  it("post-delete navigation returns to the course", () => {
    expect(QUIZ_ACTIONS).toContain("returnToCourse");
    expect(QUIZ_ACTIONS).not.toContain("modules/$moduleId");
  });
});

describe("lesson editor back target", () => {
  it("the back link goes to the course unconditionally", () => {
    expect(LESSON_BACK_LINK).toContain('to="/teacher/courses/$courseId"');
    expect(LESSON_BACK_LINK).not.toContain("modules/$moduleId");
  });

  it("no longer branches on moduleId", () => {
    // The old ternary is what made the label ("back to course") lie.
    expect(LESSON_BACK_LINK).not.toContain("moduleId");
  });

  it("keeps its back-to-course label", () => {
    expect(LESSON_BACK_LINK).toContain("teacher_common.back_to_course");
  });

  it("the dirty-guard goBack agrees with the link target", () => {
    // onBackWhileDirty routes through goBack; if they disagree, confirming the
    // unsaved-changes dialog lands somewhere else than clicking Back cleanly.
    const fn = LESSON_ACTIONS.slice(
      LESSON_ACTIONS.indexOf("function goBack"),
      LESSON_ACTIONS.indexOf("async function handleSave"),
    );
    expect(fn).toContain('to: "/teacher/courses/$courseId"');
    expect(fn).not.toContain("modules/$moduleId");
  });
});
