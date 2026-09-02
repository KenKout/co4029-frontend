const DESKTOP_FIRST_PREFIXES = ["/admin", "/teacher", "/management"];

// URL prefixes that require elevated permissions.
const ADMIN_PREFIXES = ["/admin"];
const TEACHER_PREFIXES = ["/teacher"];
// Every manager surface — courses, enrolment, career pathways, users, org
// units — lives under one prefix. It used to be two (/dept for the course
// pages, /management for the rest), so both had to be listed here and in
// SectionSwitcher, and adding a manager page meant remembering which half it
// belonged to. Gated on permissions the plain teacher role lacks.
const MANAGER_PREFIXES = ["/management"];

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
