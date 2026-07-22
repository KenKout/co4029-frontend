import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Building2,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  Shield,
  MessageSquare,
  FileText,
  Activity,
  Cpu,
  DollarSign,
  ScrollText,
  Briefcase,
  User,
  GraduationCap,
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
  { label: "Dashboard", i18nKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Courses", i18nKey: "nav.courses", href: "/courses", icon: BookOpen },
  { label: "Progress", i18nKey: "nav.progress", href: "/progress", icon: BarChart3 },
  { label: "Career Paths", i18nKey: "nav.career_paths", href: "/career-paths", icon: Briefcase },
];

export const studentNavGroups: NavGroup[] = [
  {
    label: "Learning",
    i18nKey: "nav_groups.learning",
    items: [
      { label: "Dashboard", i18nKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Courses", i18nKey: "nav.courses", href: "/courses", icon: BookOpen },
    ],
  },
  {
    label: "My Journey",
    i18nKey: "nav_groups.my_journey",
    items: [
      { label: "Progress", i18nKey: "nav.progress", href: "/progress", icon: BarChart3 },
      { label: "Career Paths", i18nKey: "nav.career_paths", href: "/career-paths", icon: Briefcase },
    ],
  },
];

// ─── Teacher ──────────────────────────────────────────────────────────────────

export const teacherNavItems: NavItem[] = [
  { label: "Overview", i18nKey: "nav.overview", href: "/teacher", icon: LayoutDashboard, exact: true },
  { label: "My Courses", i18nKey: "nav.my_courses", href: "/teacher/courses", icon: BookOpen },
  { label: "Students", i18nKey: "nav.students", href: "/teacher/students", icon: GraduationCap },
  { label: "Department Courses", i18nKey: "nav.department_courses", href: "/dept", icon: Users },
  { label: "Career Paths", i18nKey: "nav.career_paths", href: "/management/career-paths", icon: Briefcase },
];

export const teacherNavGroups: NavGroup[] = [
  {
    label: "Overview",
    i18nKey: "nav_groups.overview",
    items: [
      { label: "Overview", i18nKey: "nav.overview", href: "/teacher", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Content",
    i18nKey: "nav_groups.content",
    items: [
      { label: "My Courses", i18nKey: "nav.my_courses", href: "/teacher/courses", icon: BookOpen },
      { label: "Students", i18nKey: "nav.students", href: "/teacher/students", icon: GraduationCap },
      { label: "Department Courses", i18nKey: "nav.department_courses", href: "/dept", icon: Users },
    ],
  },
  {
    label: "Pathways",
    i18nKey: "nav_groups.pathways",
    items: [
      { label: "Career Paths", i18nKey: "nav.career_paths", href: "/management/career-paths", icon: Briefcase },
    ],
  },
];

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminNavItems: NavItem[] = [
  { label: "Dashboard", i18nKey: "nav.dashboard", href: "/admin/stats", icon: LayoutDashboard, exact: true },
  { label: "Active Users", i18nKey: "nav.active_users", href: "/admin/stats/active", icon: Activity },
  { label: "Content", i18nKey: "nav.content", href: "/admin/stats/content", icon: BarChart3 },
  { label: "Users", i18nKey: "nav.users", href: "/admin/users", icon: Users },
  { label: "Organizations", i18nKey: "nav.organizations", href: "/admin/organizations", icon: Building2 },
  { label: "Courses", i18nKey: "nav.courses", href: "/admin/courses", icon: BookOpen },
  { label: "Processing", i18nKey: "nav.processing", href: "/admin/processing", icon: Cpu },
  { label: "AI Costs", i18nKey: "nav.ai_costs", href: "/admin/ai-costs", icon: DollarSign },
  { label: "Audit Logs", i18nKey: "nav.audit_logs", href: "/admin/audit-logs", icon: ScrollText },
  { label: "Health", i18nKey: "nav.health", href: "/admin/health", icon: Shield },
];

export const adminNavGroups: NavGroup[] = [
  {
    label: "Analytics",
    i18nKey: "nav_groups.analytics",
    items: [
      { label: "Dashboard", i18nKey: "nav.dashboard", href: "/admin/stats", icon: LayoutDashboard, exact: true },
      { label: "Active Users", i18nKey: "nav.active_users", href: "/admin/stats/active", icon: Activity },
      { label: "Content Stats", i18nKey: "nav.content", href: "/admin/stats/content", icon: BarChart3 },
    ],
  },
  {
    label: "Management",
    i18nKey: "nav_groups.management",
    items: [
      { label: "Users", i18nKey: "nav.users", href: "/admin/users", icon: Users },
      { label: "Organizations", i18nKey: "nav.organizations", href: "/admin/organizations", icon: Building2 },
      { label: "Courses", i18nKey: "nav.courses", href: "/admin/courses", icon: BookOpen },
    ],
  },
  {
    label: "System",
    i18nKey: "nav_groups.system",
    items: [
      { label: "Processing", i18nKey: "nav.processing", href: "/admin/processing", icon: Cpu },
      { label: "AI Costs", i18nKey: "nav.ai_costs", href: "/admin/ai-costs", icon: DollarSign },
      { label: "Audit Logs", i18nKey: "nav.audit_logs", href: "/admin/audit-logs", icon: ScrollText },
      { label: "Health", i18nKey: "nav.health", href: "/admin/health", icon: Shield },
    ],
  },
];

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settingsNavItems: NavItem[] = [
  { label: "Profile", i18nKey: "nav.profile", href: "/profile", icon: User },
  { label: "Account settings", i18nKey: "nav.settings", href: "/settings", icon: Settings },
  { label: "Security", i18nKey: "nav.health", href: "/settings/security", icon: Shield },
  { label: "Notifications", i18nKey: "nav.processing", href: "/settings/notifications", icon: MessageSquare },
];

// ─── Secondary / Bottom ───────────────────────────────────────────────────────

export const secondaryNavItems: NavItem[] = [
  { label: "Help", href: "#", icon: HelpCircle },
  { label: "Log Out", i18nKey: "nav.logout", href: "#", icon: LogOut },
];

export const topNavLinks = [
  { label: "Explore", href: "/courses" },
];

void FileText;
