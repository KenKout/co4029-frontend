/**
 * Crash/offline safety net for the create-course wizard.
 *
 * The wizard collects a lot in one screen (basics, settings, contact, cover
 * image, teachers, career-path placement) and then performs SEVERAL requests,
 * because only the course row itself is creatable in one POST — teachers,
 * the thumbnail and the path placement are all sub-resources of
 * `/courses/{id}/...` and cannot exist before the course does.
 *
 * That shape produces two DIFFERENT failure modes, and this module exists to
 * cover both. Covering only the first is the trap:
 *
 *  1. BEFORE submit — the tab crashes, the laptop sleeps, the network drops
 *     while typing. Everything lives in React state and is simply gone.
 *     -> mirror the form values to localStorage, debounced.
 *
 *  2. DURING submit — the course POST succeeds, then assigning a teacher
 *     fails on a flaky connection. The course NOW EXISTS. If the retry
 *     re-runs from the top it creates a SECOND course, and the manager gets a
 *     duplicate for having clicked the button twice.
 *     -> persist `courseId` and each completed step as they land, so a resume
 *        continues from the failed step instead of starting over.
 *
 * Storage is best-effort throughout: quota, private mode and disabled storage
 * all throw, and none of them may break course creation. Every access is
 * wrapped, mirroring `lib/quiz-draft.ts` and `lib/interview/use-draft-autosave.ts`.
 */

import type { CourseFormValues } from "@/routes/_components/management-course-new/use-course-form";

const KEY = "abridgeai.coursedraft.v1";

/** Steps the submit runner performs, in order. */
export type WizardStep = "create" | "thumbnail" | "teachers" | "attachToStage";

/**
 * A single teacher assignment, recorded per user id.
 *
 * Teachers are assigned one request at a time, so "teachers" as a whole is too
 * coarse to resume from: an attempt that assigns three of five and then dies
 * must not re-assign those three. Each lands its own marker.
 */
export type TeacherStep = `teacher:${string}`;

/** Anything that can appear in a draft's `done` list. */
export type DoneStep = WizardStep | TeacherStep;

/**
 * The persisted shape IS the form's shape.
 *
 * Declared as an alias rather than a parallel interface: two hand-maintained
 * copies of the same field list drift, and the drift shows up as a restored
 * draft silently dropping a field.
 */
export type CourseDraftForm = CourseFormValues;

export interface CourseDraft {
  form: CourseDraftForm;
  /** Set once the course POST succeeded — the anti-duplicate key. */
  courseId?: string;
  /** Steps already completed, so a resume skips them. */
  done: DoneStep[];
  /** Career-path context the wizard was opened with, if any. */
  pathId?: string;
  stageId?: string;
  /** Epoch ms of the last write, used to expire stale drafts. */
  savedAt: number;
}

/**
 * Drafts older than this are ignored on load.
 *
 * A week-old half-filled form is noise, not a rescue — and offering to restore
 * it invites the manager to submit something they no longer remember writing.
 */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function loadCourseDraft(): CourseDraft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const draft = parsed as CourseDraft;
    if (!draft.form || typeof draft.form !== "object") return null;
    if (
      typeof draft.savedAt !== "number" ||
      Date.now() - draft.savedAt > MAX_AGE_MS
    ) {
      clearCourseDraft();
      return null;
    }
    // `done` drives whether steps are SKIPPED on resume, so a malformed value
    // must not silently read as "everything is finished".
    if (!Array.isArray(draft.done)) draft.done = [];
    return draft;
  } catch {
    return null;
  }
}

export function saveCourseDraft(draft: Omit<CourseDraft, "savedAt">): void {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ ...draft, savedAt: Date.now() }),
    );
  } catch {
    // Quota / private mode / disabled storage — the draft is an enhancement,
    // never a correctness dependency.
  }
}

export function clearCourseDraft(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* best-effort */
  }
}

/**
 * Is this draft worth offering to restore?
 *
 * An untouched form is not. A draft holding a `courseId` always is, even with
 * an empty-looking form: it means a course was created and the follow-up work
 * did not finish, which is precisely the state the manager must not resolve by
 * creating a second course.
 */
export function draftIsRestorable(draft: CourseDraft | null): boolean {
  if (!draft) return false;
  if (draft.courseId) return true;
  const f = draft.form;
  return Boolean(
    f.title.trim() ||
      f.description.trim() ||
      f.teacherIds.length > 0 ||
      f.contact_email.trim(),
  );
}
