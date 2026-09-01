import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import en from "@/i18n/locales/en.json";
import vi from "@/i18n/locales/vi.json";

/**
 * Duplicate interview titles.
 *
 * Two interviews with the same name in one module are indistinguishable in the
 * curriculum accordion and in every picker (the title is the only handle a
 * teacher has on them). The backend now rejects that with
 * `409 interview_title_duplicate` — scoped per module, matching the scope the
 * slug already uses. These tests pin the FRONTEND half: both add-interview
 * surfaces and the rename path must translate that code instead of leaking the
 * raw backend string, and the add dialogs must stay open so the typed title can
 * be edited rather than retyped.
 */

function read(rel: string): string {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

const COURSE_ADD = read("_components/course-manage/use-add-lesson-items.ts");
const MODULE_ADD = read("_components/module-manage/use-add-content.ts");
const CONFIG_ACTIONS = read(
  "_components/interview-config/config-page-actions.ts",
);

/** The interview-create handler of an add-controller. */
function createInterviewHandler(src: string): string {
  const start = src.indexOf("async function handleCreateInterview");
  expect(start).toBeGreaterThan(-1);
  return src.slice(start);
}

describe.each([
  ["course curriculum accordion", COURSE_ADD],
  ["module page add-content pills", MODULE_ADD],
])("add interview from the %s", (_label, src) => {
  const handler = createInterviewHandler(src);

  it("detects the backend duplicate-title conflict", () => {
    expect(handler).toContain("interview_title_duplicate");
    expect(handler).toContain("err.status === 409");
    expect(handler).toContain("err instanceof ApiError");
  });

  it("shows the translated message, not the raw backend text", () => {
    expect(handler).toContain(
      't("teacher_interview_config_new.errors.title_duplicate")',
    );
  });

  it("imports ApiError so the instanceof check is real", () => {
    // Without the import this narrows to `any` and the branch silently dies.
    expect(src).toContain('import { ApiError } from "@/lib/api/client"');
  });

  it("returns early, leaving the dialog open to edit the title", () => {
    // setInterviewModalOpen(false) only runs on success; the conflict branch
    // must return before falling through to the generic toast.
    const branch = handler.slice(
      handler.indexOf("interview_title_duplicate"),
      handler.indexOf("interview_title_duplicate") + 400,
    );
    expect(branch).toContain("return;");
    expect(branch).not.toContain("setInterviewModalOpen(false)");
  });
});

describe("renaming an interview from its settings tab", () => {
  it("reports the conflict with the config page's own message", () => {
    const save = CONFIG_ACTIONS.slice(
      CONFIG_ACTIONS.indexOf("async function saveSettings"),
      CONFIG_ACTIONS.indexOf("async function handleSaveSettings"),
    );
    expect(save).toContain("interview_title_duplicate");
    expect(save).toContain(
      't("teacher_interview_config.errors.title_duplicate")',
    );
    // Save failed → report false so the footer keeps showing unsaved changes.
    expect(save).toContain("return false;");
  });
});

describe("i18n coverage", () => {
  it("both locales define the add-dialog message", () => {
    expect(
      en.teacher_interview_config_new.errors.title_duplicate,
    ).toBeTruthy();
    expect(
      vi.teacher_interview_config_new.errors.title_duplicate,
    ).toBeTruthy();
  });

  it("both locales define the rename message", () => {
    expect(en.teacher_interview_config.errors.title_duplicate).toBeTruthy();
    expect(vi.teacher_interview_config.errors.title_duplicate).toBeTruthy();
  });

  it("carries no interpolation vars (nothing to mismatch)", () => {
    for (const msg of [
      en.teacher_interview_config_new.errors.title_duplicate,
      vi.teacher_interview_config_new.errors.title_duplicate,
      en.teacher_interview_config.errors.title_duplicate,
      vi.teacher_interview_config.errors.title_duplicate,
    ]) {
      expect(msg).not.toContain("{{");
    }
  });
});
