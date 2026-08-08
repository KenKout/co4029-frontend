import {
  Activity,
  AlertTriangle,
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
    label: "Career Paths",
    i18nKey: "nav.career_paths",
    href: "/career-paths",
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
        label: "Career Paths",
        i18nKey: "nav.career_paths",
        href: "/career-paths",
        icon: Briefcase,
      },
    ],
  },
];

// ─── Teacher ──────────────────────────────────────────────────────────────────

export const teacherNavItems: NavItem[] = [
  {
    label: "Overview",
    i18nKey: "nav.overview",
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
  {
    label: "Students",
    i18nKey: "nav.students",
    href: "/teacher/students",
    icon: GraduationCap,
  },
];

export const teacherNavGroups: NavGroup[] = [
  {
    label: "Overview",
    i18nKey: "nav_groups.overview",
    items: [
      {
        label: "Overview",
        i18nKey: "nav.overview",
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
      {
        label: "Students",
        i18nKey: "nav.students",
        href: "/teacher/students",
        icon: GraduationCap,
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
];

export const managerNavGroups: NavGroup[] = [
  {
    label: "Courses",
    i18nKey: "nav_groups.manager_courses",
    items: [
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
  {
    label: "Active Users",
    i18nKey: "nav.active_users",
    href: "/admin/stats/active",
    icon: Activity,
  },
  {
    label: "Content",
    i18nKey: "nav.content",
    href: "/admin/stats/content",
    icon: BarChart3,
  },
  { label: "Users", i18nKey: "nav.users", href: "/admin/users", icon: Users },
  {
    label: "Organizations",
    i18nKey: "nav.organizations",
    href: "/admin/organizations",
    icon: Building2,
  },
  {
    label: "Courses",
    i18nKey: "nav.courses",
    href: "/admin/courses",
    icon: BookOpen,
  },
  {
    label: "Processing",
    i18nKey: "nav.processing",
    href: "/admin/processing",
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
    label: "Health",
    i18nKey: "nav.health",
    href: "/admin/health",
    icon: Shield,
  },
  {
    // Windowed pipeline failure metrics (failed jobs / failed AI calls over
    // 24h/7d/30d). Distinct from `nav.health`, which is the infra readiness
    // probe (postgres/redis/migrations).
    label: "Job Health",
    i18nKey: "nav.job_health",
    href: "/admin/stats/health",
    icon: AlertTriangle,
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
      {
        label: "Active Users",
        i18nKey: "nav.active_users",
        href: "/admin/stats/active",
        icon: Activity,
      },
      {
        label: "Content Stats",
        i18nKey: "nav.content",
        href: "/admin/stats/content",
        icon: BarChart3,
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
        label: "Courses",
        i18nKey: "nav.courses",
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
        label: "Processing",
        i18nKey: "nav.processing",
        href: "/admin/processing",
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
        label: "Health",
        i18nKey: "nav.health",
        href: "/admin/health",
        icon: Shield,
      },
      {
        label: "Job Health",
        i18nKey: "nav.job_health",
        href: "/admin/stats/health",
        icon: AlertTriangle,
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
