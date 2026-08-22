import { FileSpreadsheet, Upload, Users } from "lucide-react";
import type { TabKey } from "./types";

/**
 * Tab order for the enrollment screen. Kept as data (rather than a branch chain
 * in the tab bar) so adding a tab never touches render logic.
 */
export const TABS: { key: TabKey; labelKey: string; icon: typeof Users }[] = [
  {
    key: "roster",
    labelKey: "management_course_enrollments.tabs.roster",
    icon: Users,
  },
  {
    key: "bulk",
    labelKey: "management_course_enrollments.tabs.bulk",
    icon: Upload,
  },
  {
    key: "codes",
    labelKey: "management_course_enrollments.tabs.codes",
    icon: FileSpreadsheet,
  },
];

/** A pasted line matching this is treated as a user id, not an email. */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Backend failure reason -> i18n key. A lookup table so the label resolver stays
 * a single indexed read instead of a chain of comparisons.
 */
export const FAILURE_KEY: Record<string, string> = {
  user_not_found: "management_course_enrollments.failure.user_not_found",
  already_enrolled: "management_course_enrollments.failure.already_enrolled",
  invalid_identifier:
    "management_course_enrollments.failure.invalid_identifier",
  forbidden: "management_course_enrollments.failure.forbidden",
  not_student: "management_course_enrollments.failure.not_student",
};
