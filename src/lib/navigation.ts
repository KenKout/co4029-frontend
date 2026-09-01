import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  Cpu,
  DollarSign,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Network,
  ScrollText,
  Settings,
  Shield,
  SlidersHorizontal,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  i18nKey?: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

export interface NavGroup {
  label: string;
  i18nKey: string;
  items: NavItem[];
}

// ─── Student ──────────────────────────────────────────────────────────────────

export const studentNavItems: NavItem[] = [
  {
    label: "Dashboard",
    i18nKey: "nav.dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Courses",
    i18nKey: "nav.courses",
    href: "/courses",
    icon: BookOpen,
  },
  {
    label: "Progress",
    i18nKey: "nav.progress",
    href: "/progress",
    icon: BarChart3,
  },
  {
    label: "Learning Programs",
    href: "/learning-programs",
    icon: Briefcase,
  },
];

export const studentNavGroups: NavGroup[] = [
  {
    label: "Learning",
    i18nKey: "nav_groups.learning",
    items: [
      {
        label: "Dashboard",
        i18nKey: "nav.dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        label: "Courses",
        i18nKey: "nav.courses",
        href: "/courses",
        icon: BookOpen,
      },
    ],
  },
  {
    label: "My Journey",
    i18nKey: "nav_groups.my_journey",
    items: [
      {
        label: "Progress",
        i18nKey: "nav.progress",
        href: "/progress",
        icon: BarChart3,
      },
      {
        label: "Learning Programs",
        href: "/learning-programs",
        icon: Briefcase,
      },
    ],
  },
];

// ─── Teacher ──────────────────────────────────────────────────────────────────

export const teacherNavItems: NavItem[] = [
  {
    // "Workspace", matching the page's own title. Its own key rather than
    // reusing nav.overview, which other roles' sidebars still use.
    label: "Workspace",
    i18nKey: "nav.workspace",
    href: "/teacher",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "My Courses",
    i18nKey: "nav.my_courses",
    href: "/teacher/courses",
    icon: BookOpen,
  },
];

export const teacherNavGroups: NavGroup[] = [
  {
    label: "Overview",
    i18nKey: "nav_groups.overview",
    items: [
      {
        label: "Workspace",
        i18nKey: "nav.workspace",
        href: "/teacher",
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    label: "Content",
    i18nKey: "nav_groups.content",
    items: [
      {
        label: "My Courses",
        i18nKey: "nav.my_courses",
        href: "/teacher/courses",
        icon: BookOpen,
      },
    ],
  },
];

// ─── Manager ──────────────────────────────────────────────────────────────────
//
// Managers own student + course management for their organization: course
// lifecycle (create/publish/delete + assign teachers), enrolment, learning
// outcomes, and career pathways. Teachers, by contrast, own course *content*
// only — so the two sidebars are deliberately different. These three groups
// keep the manager's distinct responsibilities visually separated.

export const managerNavItems: NavItem[] = [
  {
    label: "Courses",
    i18nKey: "nav.manager_courses",
    href: "/dept",
    icon: BookOpen,
  },
  {
    label: "Learning Programs",
    href: "/management/learning-programs",
    icon: GraduationCap,
  },
  {
    label: "Career Pathways",
    i18nKey: "nav.career_paths",
    href: "/management/career-paths",
    icon: Briefcase,
  },
  {
    label: "Users",
    i18nKey: "nav.users",
    href: "/management/users",
    icon: Users,
  },
  {
    label: "Organization",
    i18nKey: "nav.org_units",
    href: "/management/org-units",
    icon: Network,
  },
];

export const managerNavGroups: NavGroup[] = [
  {
    label: "Courses",
    i18nKey: "nav_groups.manager_courses",
    items: [
      {
        label: "Learning Programs",
        href: "/management/learning-programs",
        icon: GraduationCap,
      },
      {
        label: "Courses",
        i18nKey: "nav.manager_courses",
        href: "/dept",
        icon: BookOpen,
      },
    ],
  },
  {
    label: "Career Pathways",
    i18nKey: "nav_groups.pathways",
    items: [
      {
        label: "Career Pathways",
        i18nKey: "nav.career_paths",
        href: "/management/career-paths",
        icon: Briefcase,
      },
    ],
  },
  {
    label: "Users",
    i18nKey: "nav_groups.users",
    items: [
      {
        label: "Users",
        i18nKey: "nav.users",
        href: "/management/users",
        icon: Users,
      },
    ],
  },
  {
    label: "Organization",
    i18nKey: "nav_groups.organization",
    items: [
      {
        label: "Organization",
        i18nKey: "nav.org_units",
        href: "/management/org-units",
        icon: Network,
      },
    ],
  },
];

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminNavItems: NavItem[] = [
  {
    label: "Dashboard",
    i18nKey: "nav.dashboard",
    href: "/admin/stats",
    icon: LayoutDashboard,
    exact: true,
  },
  { label: "Users", i18nKey: "nav.users", href: "/admin/users", icon: Users },
  {
    label: "Organizations",
    i18nKey: "nav.organizations",
    href: "/admin/organizations",
    icon: Building2,
  },
  {
    // Named "Resource inventory", not "Courses": from a system administrator's
    // seat this is tenant resource accounting, not academic management, and
    // the old label implied admin participates in course work (PRD ADM-043).
    // Its own i18n key because `nav.courses` is the learner/teacher entry and
    // must keep saying "Courses" there.
    label: "Resource inventory",
    i18nKey: "nav.resource_inventory",
    href: "/admin/courses",
    icon: BookOpen,
  },
  {
    // Services + Jobs & Queues + Failures in one module (PRD ADM-010). It
    // replaces the former Processing / Health / Job Health trio, which split
    // one question — "is the platform working" — across three routes that
    // counted jobs three different ways.
    label: "Operations",
    i18nKey: "nav.operations",
    href: "/admin/operations",
    icon: Cpu,
  },
  {
    label: "AI Costs",
    i18nKey: "nav.ai_costs",
    href: "/admin/ai-costs",
    icon: DollarSign,
  },
  {
    label: "Audit Logs",
    i18nKey: "nav.audit_logs",
    href: "/admin/audit-logs",
    icon: ScrollText,
  },
  {
    // Deployment/tenant runtime configuration (chunking, preprocessing, KG,
    // retrieval). Distinct from `nav.settings`, which is the signed-in user's
    // own account settings — hence its own i18n key and icon.
    label: "System Config",
    i18nKey: "nav.system_config",
    href: "/admin/settings",
    icon: SlidersHorizontal,
  },
];

export const adminNavGroups: NavGroup[] = [
  {
    label: "Analytics",
    i18nKey: "nav_groups.analytics",
    items: [
      {
        label: "Dashboard",
        i18nKey: "nav.dashboard",
        href: "/admin/stats",
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    label: "Management",
    i18nKey: "nav_groups.management",
    items: [
      {
        label: "Users",
        i18nKey: "nav.users",
        href: "/admin/users",
        icon: Users,
      },
      {
        label: "Organizations",
        i18nKey: "nav.organizations",
        href: "/admin/organizations",
        icon: Building2,
      },
      {
        label: "Resource inventory",
        i18nKey: "nav.resource_inventory",
        href: "/admin/courses",
        icon: BookOpen,
      },
    ],
  },
  {
    label: "System",
    i18nKey: "nav_groups.system",
    items: [
      {
        label: "Operations",
        i18nKey: "nav.operations",
        href: "/admin/operations",
        icon: Cpu,
      },
      {
        label: "AI Costs",
        i18nKey: "nav.ai_costs",
        href: "/admin/ai-costs",
        icon: DollarSign,
      },
      {
        label: "Audit Logs",
        i18nKey: "nav.audit_logs",
        href: "/admin/audit-logs",
        icon: ScrollText,
      },
      {
        label: "System Config",
        i18nKey: "nav.system_config",
        href: "/admin/settings",
        icon: SlidersHorizontal,
      },
    ],
  },
];

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settingsNavItems: NavItem[] = [
  { label: "Profile", i18nKey: "nav.profile", href: "/profile", icon: User },
  {
    label: "Account settings",
    i18nKey: "nav.settings",
    href: "/settings",
    icon: Settings,
  },
  {
    label: "Security",
    i18nKey: "nav.health",
    href: "/settings/security",
    icon: Shield,
  },
  {
    label: "Notifications",
    i18nKey: "nav.processing",
    href: "/settings/notifications",
    icon: MessageSquare,
  },
];

// ─── Secondary / Bottom ───────────────────────────────────────────────────────

export const secondaryNavItems: NavItem[] = [
  // Was href:"#" — now points at the public help page.
  { label: "Help", i18nKey: "nav.help", href: "/help", icon: HelpCircle },
  { label: "Log Out", i18nKey: "nav.logout", href: "#", icon: LogOut },
];

export const topNavLinks = [{ label: "Explore", href: "/courses" }];

void FileText;
