import type { CourseUpdate } from "@/lib/api/types";
import type {
  CourseSettingsField,
  CourseSettingsInitialValues,
  CourseSettingsValues,
  TeacherCourse,
} from "./types";

/**
 * The pure form model behind `CourseSettingsPanel`: what the saved course looks
 * like as form values, what the form seeds itself with, whether it is dirty,
 * and what it PATCHes on Save.
 *
 * Extracted from the former 550-line / complexity-48 `CourseSettingsPanel`,
 * whose `settingsDirty` memo alone scored 29 and whose `handleSave` scored 16 —
 * every one of those points was a `??` / `||` / `?:` in a field chain, so the
 * chains moved here and the panel kept the behaviour. Field order below matches
 * the original `||`-chain exactly, so short-circuit order is preserved.
 */

/** Every settings field, in the order the original dirty-check compared them. */
export const COURSE_SETTINGS_FIELDS: readonly CourseSettingsField[] = [
  "title",
  "slug",
  "description",
  "estimatedMinutes",
  "enrollmentCap",
  "contactEmail",
  "contactPhone",
  "contactWebsiteUrl",
  "contactSocialUrl",
];

/**
 * Fields the original dirty-check compared *trimmed* — the free-text inputs.
 * The selects and number inputs were compared raw and stay that way.
 */
const TRIMMED_SETTINGS_FIELDS = new Set<CourseSettingsField>([
  "title",
  "slug",
  "description",
  "contactEmail",
  "contactPhone",
  "contactWebsiteUrl",
  "contactSocialUrl",
]);

/** Saved course meta, normalised exactly as the form holds it. */
function savedCourseMeta(
  course: TeacherCourse,
): Omit<
  CourseSettingsValues,
  "contactEmail" | "contactPhone" | "contactWebsiteUrl" | "contactSocialUrl"
> {
  return {
    title: course.title ?? "",
    slug: course.slug ?? "",
    description: course.description ?? "",
    estimatedMinutes: course.estimated_minutes?.toString() ?? "",
    enrollmentCap: course.enrollment_cap?.toString() ?? "",
  };
}

/** Saved contact block, normalised exactly as the form holds it. */
function savedCourseContact(
  course: TeacherCourse,
): Pick<
  CourseSettingsValues,
  "contactEmail" | "contactPhone" | "contactWebsiteUrl" | "contactSocialUrl"
> {
  return {
    contactEmail: course.contact_email ?? "",
    contactPhone: course.contact_phone ?? "",
    contactWebsiteUrl: course.contact_website_url ?? "",
    contactSocialUrl: course.contact_social_url ?? "",
  };
}

/** The saved course as form values — the right-hand side of the dirty check. */
export function savedCourseSettings(
  course: TeacherCourse,
): CourseSettingsValues {
  return { ...savedCourseMeta(course), ...savedCourseContact(course) };
}

/**
 * Contact block for the FIRST load only: `contactEmail` autofills from the
 * teacher's account email when the course has none saved yet; the other three
 * start from whatever's saved.
 */
function initialCourseContact(
  course: TeacherCourse,
  meEmail: string | undefined,
): Pick<
  CourseSettingsValues,
  "contactEmail" | "contactPhone" | "contactWebsiteUrl" | "contactSocialUrl"
> {
  return {
    contactEmail: course.contact_email ?? meEmail ?? "",
    contactPhone: course.contact_phone ?? "",
    contactWebsiteUrl: course.contact_website_url ?? "",
    contactSocialUrl: course.contact_social_url ?? "",
  };
}

/** Everything the form seeds itself with on its one-shot initialisation. */
export function initialCourseSettings(
  course: TeacherCourse,
  meEmail: string | undefined,
): CourseSettingsInitialValues {
  return {
    ...savedCourseMeta(course),
    ...initialCourseContact(course, meEmail),
    lastSaved: course.updated_at ?? null,
  };
}

/** Fields a TEACHER can actually save; the rest are manager-owned. */
const TEACHER_SETTINGS_FIELDS = new Set<CourseSettingsField>([
  "description",
  "estimatedMinutes",
  "contactEmail",
  "contactPhone",
  "contactWebsiteUrl",
  "contactSocialUrl",
]);

/**
 * Whether the buffered form differs from the saved course (a staged thumbnail
 * counts). Same comparisons, same order, same short-circuit as the original
 * `||` chain.
 *
 * `scope` narrows which fields count: on the teacher surface a manager-only
 * field can never be saved, so letting it mark the form dirty would enable a
 * Save that either does nothing or 403s.
 */
export function isCourseSettingsDirty(args: {
  draft: CourseSettingsValues;
  saved: CourseSettingsValues;
  stagedThumbnail: File | null;
  scope?: "teacher" | "manager";
}): boolean {
  const { draft, saved, stagedThumbnail, scope = "manager" } = args;
  if (stagedThumbnail !== null) return true;
  const fields =
    scope === "teacher"
      ? COURSE_SETTINGS_FIELDS.filter((f) => TEACHER_SETTINGS_FIELDS.has(f))
      : COURSE_SETTINGS_FIELDS;
  return fields.some((field) =>
    TRIMMED_SETTINGS_FIELDS.has(field)
      ? draft[field].trim() !== saved[field]
      : draft[field] !== saved[field],
  );
}

/**
 * Course meta a TEACHER may patch. `course.update` is the CONTENT permission:
 * description and the study-time estimate. Title/slug (identity), status
 * (lifecycle) and caps / thumbnail (delivery policy) are manager-owned and
 * the backend 403s the whole PATCH if any of them appear, so they must not
 * be in a teacher payload even unchanged.
 */
function buildCourseMetaPayload(values: CourseSettingsValues): CourseUpdate {
  return {
    description: values.description.trim() || undefined,
    estimated_minutes: values.estimatedMinutes
      ? Number(values.estimatedMinutes)
      : undefined,
  };
}

/**
 * The manager-only half: identity and delivery policy. Sent from the dept
 * course page, which holds `course.delete`. Lifecycle (status) is NOT part
 * of the PATCH — it is driven by the dedicated Publish/Archive endpoints
 * (`DeptCourseLifecycleActions` on the dept course header).
 */
function buildManagerMetaPayload(values: CourseSettingsValues): CourseUpdate {
  return {
    title: values.title.trim() || undefined,
    slug: values.slug.trim() || undefined,
    enrollment_cap: values.enrollmentCap
      ? Number(values.enrollmentCap)
      : undefined,
  };
}

/**
 * Contact half of the Save payload: send trimmed value or null so clearing a
 * field in the form actually blanks the column (backend also normalises "" →
 * null as a belt-and-braces guard).
 */
function buildContactPayload(values: CourseSettingsValues): CourseUpdate {
  return {
    contact_email: values.contactEmail.trim() || null,
    contact_phone: values.contactPhone.trim() || null,
    contact_website_url: values.contactWebsiteUrl.trim() || null,
    contact_social_url: values.contactSocialUrl.trim() || null,
  };
}

/** The PATCH body the TEACHER surface sends: content fields + own contact. */
export function buildCourseUpdatePayload(
  values: CourseSettingsValues,
): CourseUpdate {
  return { ...buildCourseMetaPayload(values), ...buildContactPayload(values) };
}

/**
 * The PATCH body the MANAGER surface sends: everything, since `course.delete`
 * covers both halves. Kept as one call so the dept page cannot accidentally
 * ship a payload that silently drops the teacher-editable fields.
 */
export function buildManagerCourseUpdatePayload(
  values: CourseSettingsValues,
): CourseUpdate {
  return {
    ...buildManagerMetaPayload(values),
    ...buildCourseMetaPayload(values),
    ...buildContactPayload(values),
  };
}
