import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Building2,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  Home,
  Shield,
  MessageSquare,
  FileText,
  Activity,
  Cpu,
  DollarSign,
  ScrollText,
  Briefcase,
  User,
  Mic,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  i18nKey?: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const studentNavItems: NavItem[] = [
  { label: "Dashboard", i18nKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Courses", i18nKey: "nav.courses", href: "/courses", icon: BookOpen },
  { label: "Progress", i18nKey: "nav.progress", href: "/progress", icon: BarChart3 },
  { label: "My Interviews", i18nKey: "nav.my_interviews", href: "/me/interviews", icon: Mic },
  { label: "Career Paths", i18nKey: "nav.career_paths", href: "/career-paths", icon: Briefcase },
];

export const teacherNavItems: NavItem[] = [
  { label: "Overview", i18nKey: "nav.overview", href: "/teacher", icon: LayoutDashboard, exact: true },
  { label: "My Courses", i18nKey: "nav.my_courses", href: "/teacher/courses", icon: BookOpen },
  { label: "Department Courses", i18nKey: "nav.department_courses", href: "/dept", icon: Users },
  { label: "Career Paths", i18nKey: "nav.career_paths", href: "/management/career-paths", icon: Briefcase },
];

export const instructorNavItems: NavItem[] = [
  { label: "Dashboard", i18nKey: "nav.dashboard", href: "/teacher", icon: LayoutDashboard },
  { label: "My Courses", i18nKey: "nav.my_courses", href: "/teacher/courses", icon: BookOpen },
];

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

export const settingsNavItems: NavItem[] = [
  { label: "Profile", i18nKey: "nav.profile", href: "/profile", icon: User },
  { label: "Account settings", i18nKey: "nav.settings", href: "/settings", icon: Settings },
  { label: "Security", i18nKey: "nav.health", href: "/settings/security", icon: Shield },
  { label: "Notifications", i18nKey: "nav.processing", href: "/settings/notifications", icon: MessageSquare },
];

export const bottomNavItems: NavItem[] = [
  { label: "Home", i18nKey: "nav.dashboard", href: "/dashboard", icon: Home },
  { label: "Courses", i18nKey: "nav.courses", href: "/courses", icon: BookOpen },
  { label: "Profile", i18nKey: "nav.profile", href: "/profile", icon: User },
];

export const instructorBottomNavItems: NavItem[] = [
  { label: "Dashboard", i18nKey: "nav.dashboard", href: "/teacher", icon: LayoutDashboard },
  { label: "Courses", i18nKey: "nav.courses", href: "/teacher/courses", icon: BookOpen },
];

export const adminBottomNavItems: NavItem[] = [
  { label: "Dashboard", i18nKey: "nav.dashboard", href: "/admin/stats", icon: LayoutDashboard },
  { label: "Users", i18nKey: "nav.users", href: "/admin/users", icon: Users },
  { label: "Organizations", i18nKey: "nav.organizations", href: "/admin/organizations", icon: Building2 },
  { label: "Courses", i18nKey: "nav.courses", href: "/admin/courses", icon: BookOpen },
  { label: "AI Costs", i18nKey: "nav.ai_costs", href: "/admin/ai-costs", icon: DollarSign },
];

export const secondaryNavItems: NavItem[] = [
  { label: "Help", href: "#", icon: HelpCircle },
  { label: "Log Out", i18nKey: "nav.logout", href: "#", icon: LogOut },
];

export const topNavLinks = [
  { label: "Explore", href: "/courses" },
  { label: "Dashboard", href: "/dashboard" },
];

void FileText;
