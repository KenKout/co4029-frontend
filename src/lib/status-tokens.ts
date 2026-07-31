/**
 * Named status → Tailwind colour-token maps.
 *
 * Before this, ~16 files each declared a local `STATUS_COLOR` map. They are NOT
 * all the same: `inactive` is amber for organizations but red for users;
 * `archived` is slate-100/200/500 in different domains. Collapsing them into
 * one global map would silently repaint the UI. Instead each domain keeps its
 * own named set here, with the exact colours it used before — this dedupes the
 * *pattern* (map + `?? fallback`) without changing any pixels.
 *
 * `statusToken(map, status)` applies the shared slate fallback every call site
 * used. Pair these with the `<StatusBadge>` component in ui/status-badge.tsx.
 */

export type StatusTokenMap = Record<string, string>;

/** The fallback every local map used for an unknown status. */
export const STATUS_FALLBACK = "bg-slate-100 text-slate-700";

/** Course lifecycle where archived is the faint slate-500 (dept-courses,
 *  management-enrolment, career-paths list + detail). */
export const COURSE_STATUS_TOKENS: StatusTokenMap = {
  draft: "bg-amber-100 text-amber-700",
  published: "bg-emerald-100 text-emerald-700",
  archived: "bg-slate-100 text-slate-500",
};

/** Admin course list — archived is the heavier slate-200. */
export const ADMIN_COURSE_STATUS_TOKENS: StatusTokenMap = {
  draft: "bg-amber-100 text-amber-700",
  published: "bg-emerald-100 text-emerald-700",
  archived: "bg-slate-200 text-slate-700",
};

/** Teacher students-hub — draft is the lighter amber-50. */
export const TEACHER_COURSE_STATUS_TOKENS: StatusTokenMap = {
  published: "bg-emerald-100 text-emerald-700",
  draft: "bg-amber-50 text-amber-700",
  archived: "bg-slate-100 text-slate-500",
};

/** User account status (profile, admin users + user-detail). */
export const USER_STATUS_TOKENS: StatusTokenMap = {
  active: "bg-emerald-100 text-emerald-700",
  invited: "bg-amber-100 text-amber-700",
  pending: "bg-slate-100 text-slate-700",
  disabled: "bg-red-100 text-red-700",
  inactive: "bg-red-100 text-red-700",
  suspended: "bg-red-100 text-red-700",
};

/** Organization status — note `inactive` is amber here (vs red for users). */
export const ORG_STATUS_TOKENS: StatusTokenMap = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-amber-100 text-amber-700",
  archived: "bg-slate-100 text-slate-700",
};

/** Combined org + membership status (organization-detail): org states plus the
 *  membership-only invited / suspended / left. */
export const ORG_MEMBERSHIP_STATUS_TOKENS: StatusTokenMap = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-amber-100 text-amber-700",
  archived: "bg-slate-100 text-slate-700",
  invited: "bg-sky-100 text-sky-700",
  suspended: "bg-red-100 text-red-700",
  left: "bg-slate-100 text-slate-600",
};

/** Background processing-job status. */
export const JOB_STATUS_TOKENS: StatusTokenMap = {
  pending: "bg-slate-100 text-slate-700",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-slate-200 text-slate-700",
};

/** Career-path enrollment status (me-career-paths). */
export const ENROLLMENT_STATUS_TOKENS: StatusTokenMap = {
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-m3-primary-fixed text-m3-primary",
  dropped: "bg-slate-100 text-slate-500",
};

/** Look up a status colour with the shared slate fallback. */
export function statusToken(
  map: StatusTokenMap,
  status: string | undefined,
): string {
  if (!status) return STATUS_FALLBACK;
  return map[status] ?? STATUS_FALLBACK;
}
