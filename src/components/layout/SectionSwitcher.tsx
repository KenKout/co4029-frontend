import { Link, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  ShieldCheck,
  Briefcase,
  Building2,
} from "lucide-react";
import { usePermissions } from "@/lib/auth/use-permissions";
import { cn } from "@/lib/utils";

interface SectionLink {
  i18nKey: string;
  fallback: string;
  href: string;
  icon: typeof LayoutDashboard;
  prefix: string;
  show: (perms: string[]) => boolean;
}

const SECTIONS: SectionLink[] = [
  {
    i18nKey: "sections.student",
    fallback: "Student",
    href: "/dashboard",
    icon: LayoutDashboard,
    prefix: "/dashboard",
    show: () => true,
  },
  {
    i18nKey: "sections.teacher",
    fallback: "Teacher",
    href: "/teacher",
    icon: Briefcase,
    prefix: "/teacher",
    show: (perms) =>
      perms.includes("course.create") || perms.includes("lesson.manage"),
  },
  {
    // Manager: student + course management (course lifecycle, enrolment,
    // teacher assignment, career pathways). Gated on permissions the teacher
    // role does NOT hold, so a plain teacher never sees this section.
    i18nKey: "sections.manager",
    fallback: "Manager",
    href: "/management/courses",
    icon: Building2,
    prefix: "/management",
    show: (perms) =>
      perms.includes("course.assign_teacher") ||
      perms.includes("org_unit.manage") ||
      perms.includes("course.enrollment.create"),
  },
  {
    i18nKey: "sections.admin",
    fallback: "Admin",
    href: "/admin/stats",
    icon: ShieldCheck,
    prefix: "/admin",
    show: (perms) => perms.includes("system.administer"),
  },
];

export default function SectionSwitcher() {
  const { t } = useTranslation();
  const location = useLocation();
  const permissions = usePermissions();
  const perms = permissions.permissions;

  const visible = SECTIONS.filter((s) => s.show(perms));
  if (visible.length <= 1) return null;

  // Longest prefix wins, so a section nested under another still resolves to
  // itself. This used to need a MANAGER_EXTRA_PREFIXES escape hatch because the
  // manager's course pages lived at /dept while the rest of the section lived
  // at /management; with every manager route under one prefix the special case
  // is gone.
  const activePrefix =
    [...visible]
      .sort((a, b) => b.prefix.length - a.prefix.length)
      .find((s) => location.pathname.startsWith(s.prefix))?.prefix ??
    "/dashboard";

  return (
    <nav
      aria-label="Section switcher"
      className="hidden sm:flex items-center gap-1 rounded-md border border-border bg-surface p-1"
    >
      {visible.map((s) => {
        const isActive = s.prefix === activePrefix;
        const Icon = s.icon;
        return (
          <Link
            key={s.href}
            to={s.href}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 h-7 rounded-sm text-xs font-semibold transition-colors cursor-pointer",
              isActive
                ? "bg-primary text-white shadow-sm"
                : "text-text-muted hover:text-primary hover:bg-surface-muted",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{t(s.i18nKey, { defaultValue: s.fallback })}</span>
          </Link>
        );
      })}
    </nav>
  );
}
