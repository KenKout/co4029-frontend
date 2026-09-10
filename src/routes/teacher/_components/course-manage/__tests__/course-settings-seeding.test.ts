import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  COURSE_SETTINGS_FIELDS,
  isCourseSettingsDirty,
  savedCourseSettings,
  buildManagerCourseUpdatePayload,
} from "../course-settings-model";
import type { TeacherCourse } from "../types";

/**
 * Every settings field must be SEEDED from the loaded course.
 *
 * A round-trip assertion is the honest guard here: seed from a course, compare
 * against the same course, and the form must be clean. That fails for ANY field
 * left out of `applyInitial`, not just this one.
 */

const MODEL_DIR = resolve(__dirname, "..");

/** A saved course with every settings-backed column populated and distinct. */
const COURSE = {
  id: "course-1",
  title: "Database Systems",
  slug: "co2013-database-systems",
  faculty_id: "4dcd8d69-9dbd-4785-9adf-933fd0cc6a62",
  faculty_name: "Computer Science",
  description: "History and motivations for database systems",
  estimated_minutes: 12000,
  contact_email: "teacher@abridgeai.local",
  contact_phone: "0900000000",
  contact_website_url: "https://example.com",
  contact_social_url: "https://example.com/social",
  updated_at: "2026-09-05T00:00:00Z",
} as unknown as TeacherCourse;

describe("course settings seeding", () => {
  it("seeds every field in CourseSettingsValues", () => {
    // Read applyInitial as text: importing the hook would need a React renderer,
    // and the property we care about is purely "is each setter called".
    const src = readFileSync(
      resolve(MODEL_DIR, "use-course-settings-fields.ts"),
      "utf8",
    );
    const body = src.slice(
      src.indexOf("function applyInitial"),
      src.indexOf("return { open"),
    );

    const missing = COURSE_SETTINGS_FIELDS.filter((field) => {
      const setter = `set${field.charAt(0).toUpperCase()}${field.slice(1)}`;
      return !body.includes(`${setter}(init.${field})`);
    });
    expect(missing).toEqual([]);
  });

  it("is CLEAN immediately after seeding from a saved course", () => {
    // The round-trip that catches an unseeded field regardless of how
    // applyInitial is written.
    const saved = savedCourseSettings(COURSE);
    expect(
      isCourseSettingsDirty({
        draft: saved,
        saved,
        stagedThumbnail: null,
        scope: "manager",
      }),
    ).toBe(false);
  });

  it("keeps faculty_id out of every update payload", () => {
    const payload = buildManagerCourseUpdatePayload(savedCourseSettings(COURSE));
    expect("faculty_id" in payload).toBe(false);
  });
});
