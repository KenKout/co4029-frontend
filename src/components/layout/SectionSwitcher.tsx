import { Link, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  ShieldCheck,
  Briefcase,
  Building2,
} from "lucide-react";
import { useMyRoles } from "@/lib/api/hooks/admin";
import {
  rolesForSwitcher,
  type RoleSwitcherRole,
} from "@/lib/auth/role-switcher";
import { cn } from "@/lib/utils";

interface SectionLink {
  role: RoleSwitcherRole;
  i18nKey: string;
  fallback: string;
  href: string;
  icon: typeof LayoutDashboard;
  prefix: string;
}

const SECTIONS: SectionLink[] = [
  {
    role: "student",
    i18nKey: "sections.student",
    fallback: "Student",
    href: "/dashboard",
    icon: LayoutDashboard,
    prefix: "/dashboard",
  },
  {
    role: "teacher",
    i18nKey: "sections.teacher",
    fallback: "Teacher",
    href: "/teacher",
    icon: Briefcase,
    prefix: "/teacher",
  },
  {
    role: "manager",
    i18nKey: "sections.manager",
    fallback: "Manager",
    href: "/management",
    icon: Building2,
    prefix: "/management",
  },
  {
    role: "hod",
    i18nKey: "sections.dean",
    fallback: "Dean",
    href: "/management",
    icon: Building2,
    prefix: "/management",
  },
  {
    role: "admin",
    i18nKey: "sections.admin",
    fallback: "Admin",
    href: "/admin/stats",
    icon: ShieldCheck,
    prefix: "/admin",
  },
];

/**
 * The role switch bar in the top bar. Its entries come from the caller's
 * active role assignments, not effective permissions: permissions overlap, so
 * using them made every manager look like a teacher and made the switcher
 * disappear for multi-role non-admin users.
 */
export default function SectionSwitcher() {
  const { t } = useTranslation();
  const location = useLocation();
  const roles = useMyRoles();
  const visibleRoles = rolesForSwitcher(roles.data ?? []);
  const visible = SECTIONS.filter((s) => visibleRoles.includes(s.role));
  if (visible.length <= 1) return null;

  // Longest prefix wins, so a section nested under another still resolves to
  // itself. This used to need a MANAGER_EXTRA_PREFIXES escape hatch because the
  // manager's course pages lived at /dept while the rest of the section lived
  // at /management; with every manager route under one prefix the special case
  // is gone.
  const activeRole = [...visible]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((s) => location.pathname.startsWith(s.prefix))?.role;

  return (
    <nav
      aria-label={t("sections.switcher_aria")}
      className="hidden sm:flex items-center gap-1 rounded-md border border-border bg-surface p-1"
    >
      {visible.map((s) => {
        // Dean and manager intentionally share `/management`; keep one pill
        // active instead of rendering two selected controls for one route.
        const isActive = s.role === activeRole;
        const Icon = s.icon;
        return (
          <Link
            key={s.role}
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
