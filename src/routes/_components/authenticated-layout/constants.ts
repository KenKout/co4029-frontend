const DESKTOP_FIRST_PREFIXES = ["/admin", "/teacher", "/management"];

// URL prefixes that require elevated permissions.
const ADMIN_PREFIXES = ["/admin"];
const TEACHER_PREFIXES = ["/teacher"];
const STUDENT_PREFIXES = ["/dashboard", "/courses", "/me"];
// Every manager surface — courses, enrolment, career pathways, users, org
// units — lives under one prefix. It used to be two (/dept for the course
// pages, /management for the rest), so both had to be listed here and in
// SectionSwitcher, and adding a manager page meant remembering which half it
// belonged to. Gated on permissions the plain teacher role lacks.
const MANAGER_PREFIXES = ["/management"];

// Permission codes that grant access — the single authority for who can
// reach a section. The header switcher uses role assignments for its labels;
// these permissions still guard direct URL access. A user hitting another
// section's URL without the required permission is denied here and the layout
// renders the 404 guard instead of the page.
const ADMIN_PERMS = ["system.administer"];
const STUDENT_PERMS = ["course.read"];
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
  STUDENT_PREFIXES,
  STUDENT_PERMS,
  TEACHER_PERMS,
  TEACHER_PREFIXES,
};
