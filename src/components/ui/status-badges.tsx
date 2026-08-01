import { ShieldCheck } from "lucide-react";
import { makeStatusBadge } from "@/components/ui/status-badge";
import {
  ADMIN_COURSE_STATUS_TOKENS,
  COURSE_STATUS_TOKENS,
  ENROLLMENT_STATUS_TOKENS,
  JOB_STATUS_TOKENS,
  ORG_MEMBERSHIP_STATUS_TOKENS,
  ORG_STATUS_TOKENS,
  USER_STATUS_TOKENS,
} from "@/lib/status-tokens";

/**
 * Pre-bound status badges — one per (token map + i18n namespace) pair.
 *
 * Before this, six route files each declared their own 6-line local
 * `StatusBadge` wrapper doing nothing but re-binding tokens + an i18n prefix +
 * a size. Binding once here kills ~36 lines of glue and, more importantly,
 * keeps each namespace pinned to exactly one definition, so a page can't drift
 * onto another page's i18n keys by copy-paste.
 *
 * These live in a .tsx module (not lib/status-tokens.ts) so the token maps stay
 * a pure, component-free data module.
 */

/** Course lifecycle, `dept_courses.status.*` (dept + management course lists). */
export const CourseStatusBadge = makeStatusBadge(
  COURSE_STATUS_TOKENS,
  "dept_courses.status",
  { size: "sm" },
);

/** Career-path lifecycle, `management_career_paths.status.*`. */
export const CareerPathStatusBadge = makeStatusBadge(
  COURSE_STATUS_TOKENS,
  "management_career_paths.status",
  { size: "sm" },
);

/** Admin course list, `admin.courses_list.row_status.*` (archived = slate-200). */
export const AdminCourseStatusBadge = makeStatusBadge(
  ADMIN_COURSE_STATUS_TOKENS,
  "admin.courses_list.row_status",
  { size: "sm" },
);

/** User account status, `admin.users.status.*`. */
export const UserStatusBadge = makeStatusBadge(
  USER_STATUS_TOKENS,
  "admin.users.status",
  { size: "sm" },
);

/** Same user tokens at md, for the detail page. */
export const UserStatusBadgeMd = makeStatusBadge(
  USER_STATUS_TOKENS,
  "admin.users.status",
);

/** Profile header badge: pill + shield icon, `profile.status.*`. */
export const ProfileStatusBadge = makeStatusBadge(
  USER_STATUS_TOKENS,
  "profile.status",
  { shape: "pill", icon: ShieldCheck },
);

/** Organization status, `admin.organizations.status_label.*`. */
export const OrgStatusBadge = makeStatusBadge(
  ORG_STATUS_TOKENS,
  "admin.organizations.status_label",
);

/** Org + membership status (organization-detail renders both namespaces, so the
 *  label is passed explicitly there rather than bound). */
export const OrgMembershipStatusBadge = makeStatusBadge(
  ORG_MEMBERSHIP_STATUS_TOKENS,
  null,
);

/** Processing-job status — renders the raw status (no i18n keys exist). */
export const JobStatusBadge = makeStatusBadge(JOB_STATUS_TOKENS, null, {
  size: "sm",
});

/** Same job tokens at md, for the job detail page. */
export const JobStatusBadgeMd = makeStatusBadge(JOB_STATUS_TOKENS, null);

/** Career-path enrollment status, `me_career_paths.status.*`. */
export const EnrollmentStatusBadge = makeStatusBadge(
  ENROLLMENT_STATUS_TOKENS,
  "me_career_paths.status",
  { size: "sm" },
);
