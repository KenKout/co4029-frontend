import type { useTranslation } from "react-i18next";
import type { useTeacherCourseOutcomes } from "@/lib/api/hooks/courses";
import type { useTeacherCourseById } from "@/lib/api/hooks/teacher-courses";
import type { CourseContentItem } from "@/lib/api/types/common";

/**
 * Shared types for the course-manage panels, extracted so each panel, its
 * hooks and its presentational sub-components agree on one definition instead
 * of passing loosely typed props. No behavioural surface of its own.
 */

/** `t` exactly as a panel's `useTranslation()` hands it out. */
export type TranslateFn = ReturnType<typeof useTranslation>["t"];

/** The i18next instance a panel reads `language` off for date formatting. */
export type I18nInstance = ReturnType<typeof useTranslation>["i18n"];

/** The course row `useTeacherCourseById` resolves to. */
export type TeacherCourse = NonNullable<
  ReturnType<typeof useTeacherCourseById>["data"]
>;

/** One learning-outcome row out of `useTeacherCourseOutcomes`. */
export type CourseOutcome = NonNullable<
  ReturnType<typeof useTeacherCourseOutcomes>["data"]
>[number];

/** Icon + label + badge triple stored in the `*_ITEM_CONFIG` constants. */
export interface ItemTypeConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
}

/** Everything a curriculum row renders from, resolved from one item. */
export interface ItemDisplay {
  cfg: ItemTypeConfig;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  title: string;
  status: string | undefined;
}

/** Item counts + publish tallies a module header renders from. */
export interface ModuleItemStats {
  allItemsSorted: CourseContentItem[];
  lessonCount: number;
  quizCount: number;
  interviewCount: number;
  statusedItems: CourseContentItem[];
  publishedCount: number;
  draftItems: CourseContentItem[];
  allPublished: boolean;
}

/**
 * The ten buffered course-settings fields, exactly as the form holds them
 * (all strings — the numeric inputs are `<Input type="number">` and stay
 * stringly typed until Save coerces them).
 *
 * `status` is deliberately absent: lifecycle is managed by the dedicated
 * Publish/Archive buttons on the dept course header
 * (`DeptCourseLifecycleActions`), not the settings PATCH.
 */
export interface CourseSettingsValues {
  title: string;
  slug: string;
  description: string;
  estimatedMinutes: string;
  contactEmail: string;
  contactPhone: string;
  contactWebsiteUrl: string;
  contactSocialUrl: string;
}

export type CourseSettingsField = keyof CourseSettingsValues;

/**
 * The twelve `setState` handles for `CourseSettingsValues`, named exactly as
 * the panel's original `useState` destructuring did (`setTitle`, `setSlug`, …)
 * so each fieldset's `onChange` bodies stay unchanged.
 */
export type CourseSettingsSetters = {
  [K in CourseSettingsField as `set${Capitalize<K>}`]: (value: string) => void;
};

/** `CourseSettingsValues` plus the seed for the "Last saved" indicator. */
export interface CourseSettingsInitialValues extends CourseSettingsValues {
  lastSaved: string | null;
}
