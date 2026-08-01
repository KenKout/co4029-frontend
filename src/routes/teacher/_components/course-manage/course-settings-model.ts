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
  "level",
  "status",
  "estimatedMinutes",
  "enrollmentCap",
  "completionDays",
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
    level: course.level ?? "",
    status: course.status ?? "draft",
    estimatedMinutes: course.estimated_minutes?.toString() ?? "",
    enrollmentCap: course.enrollment_cap?.toString() ?? "",
    completionDays: course.expected_completion_days?.toString() ?? "",
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

/**
 * Whether the buffered form differs from the saved course (a staged thumbnail
 * counts). Same comparisons, same order, same short-circuit as the original
 * `||` chain.
 */
export function isCourseSettingsDirty(args: {
  draft: CourseSettingsValues;
  saved: CourseSettingsValues;
  stagedThumbnail: File | null;
}): boolean {
  const { draft, saved, stagedThumbnail } = args;
  if (stagedThumbnail !== null) return true;
  return COURSE_SETTINGS_FIELDS.some((field) =>
    TRIMMED_SETTINGS_FIELDS.has(field)
      ? draft[field].trim() !== saved[field]
      : draft[field] !== saved[field],
  );
}

/** Course meta half of the Save payload. */
function buildCourseMetaPayload(values: CourseSettingsValues): CourseUpdate {
  return {
    slug: values.slug.trim() || undefined,
    title: values.title.trim() || undefined,
    description: values.description.trim() || undefined,
    level: (values.level || undefined) as
      | "beginner"
      | "intermediate"
      | "advanced"
      | undefined,
    status: (values.status || undefined) as
      | "draft"
      | "published"
      | "archived"
      | undefined,
    estimated_minutes: values.estimatedMinutes
      ? Number(values.estimatedMinutes)
      : undefined,
    enrollment_cap: values.enrollmentCap
      ? Number(values.enrollmentCap)
      : undefined,
    expected_completion_days: values.completionDays
      ? Number(values.completionDays)
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

/** The full PATCH body Save sends for the settings form. */
export function buildCourseUpdatePayload(
  values: CourseSettingsValues,
): CourseUpdate {
  return { ...buildCourseMetaPayload(values), ...buildContactPayload(values) };
}
