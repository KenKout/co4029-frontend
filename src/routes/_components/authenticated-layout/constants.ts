const DESKTOP_FIRST_PREFIXES = ["/admin", "/teacher", "/dept", "/management"];

// URL prefixes that require elevated permissions.
const ADMIN_PREFIXES = ["/admin"];
const TEACHER_PREFIXES = ["/teacher"];
// Manager surfaces: course management (/dept), enrolment + career pathways
// (/management). Gated on permissions the plain teacher role lacks.
const MANAGER_PREFIXES = ["/dept", "/management"];

// Permission codes that grant access. Mirror SectionSwitcher.tsx so the
// header switcher and the route guard agree on who can reach what.
const ADMIN_PERMS = ["system.administer"];
const TEACHER_PERMS = ["course.create", "lesson.manage"];
const MANAGER_PERMS = [
  "course.assign_teacher",
  "org_unit.manage",
  "course.enrollment.create",
  "course.enrollment.read",
];

export {
  ADMIN_PERMS,
  ADMIN_PREFIXES,
  DESKTOP_FIRST_PREFIXES,
  MANAGER_PERMS,
  MANAGER_PREFIXES,
  TEACHER_PERMS,
  TEACHER_PREFIXES,
};
