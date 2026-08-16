import {
  Outlet,
  useLocation,
  useParams,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Activity,
  Brain,
  ClipboardList,
  GripVertical,
  Library,
  Users,
} from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Tabs } from "@/components/ui/tabs";
import { useTeacherCourseById } from "@/lib/api/hooks/teacher-courses";

/**
 * Course-scoped layout for the teacher workspace. Renders a persistent header
 * (standard breadcrumb, course title) plus a tab bar that stays put across the
 * per-course tabs (Curriculum / Students / Progress / Assessments / Question
 * bank / Retention) and highlights the active one. Tab pages render into the
 * <Outlet/> below it, so switching tabs no longer bounces back to Curriculum.
 *
 * Only the "tab" routes nest under this shell. Drill-downs (lesson/module/quiz
 * editors, a single student, a quiz attempt) are sibling routes that take the
 * full screen and navigate back to their owning tab.
 */
type TabTo =
  | "/teacher/courses/$courseId"
  | "/teacher/courses/$courseId/students"
  | "/teacher/courses/$courseId/progress"
  | "/teacher/courses/$courseId/assessments"
  | "/teacher/courses/$courseId/question-bank"
  | "/teacher/courses/$courseId/sr-cohort";

type TabDef = {
  key: string;
  /** Full typed route path for the tab; the index (Curriculum) tab uses the
      bare course path. */
  to: TabTo;
  /** Trailing path segment used to detect the active tab; "" is the index. */
  segment: string;
  labelKey: string;
  icon: typeof Users;
};

const TABS: TabDef[] = [
  {
    key: "curriculum",
    to: "/teacher/courses/$courseId",
    segment: "",
    labelKey: "teacher_common.section_curriculum",
    icon: GripVertical,
  },
  {
    key: "students",
    to: "/teacher/courses/$courseId/students",
    segment: "students",
    labelKey: "teacher_common.nav_students",
    icon: Users,
  },
  {
    key: "progress",
    to: "/teacher/courses/$courseId/progress",
    segment: "progress",
    labelKey: "teacher_common.nav_progress",
    icon: Activity,
  },
  {
    key: "assessments",
    to: "/teacher/courses/$courseId/assessments",
    segment: "assessments",
    labelKey: "teacher_common.nav_assessments",
    icon: ClipboardList,
  },
  {
    key: "question-bank",
    to: "/teacher/courses/$courseId/question-bank",
    segment: "question-bank",
    labelKey: "teacher_common.nav_question_bank",
    icon: Library,
  },
  {
    key: "retention",
    to: "/teacher/courses/$courseId/sr-cohort",
    segment: "sr-cohort",
    labelKey: "teacher_common.nav_retention",
    icon: Brain,
  },
];

export default function CourseShell() {
  const { t } = useTranslation();
  const location = useLocation();
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  const { data: course } = useTeacherCourseById(courseId);

  const base = `/teacher/courses/${courseId}`;
  // Determine active tab from the path segment right after the courseId.
  const rest = location.pathname.startsWith(base)
    ? location.pathname.slice(base.length).replace(/^\//, "")
    : "";
  const activeSegment = rest.split("/")[0] ?? "";

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="pt-4">
        <Breadcrumbs
          items={[
            {
              label: t("teacher_common.breadcrumb_teaching"),
              to: "/teacher/courses",
            },
            { label: course?.title ?? t("teacher_common.breadcrumb_course") },
          ]}
        />
      </div>

      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h1 className="min-w-0 flex-1 text-xl font-headline font-bold text-m3-on-surface truncate">
              {course?.title ?? t("teacher_common.curriculum_fallback_title")}
            </h1>
          </div>
        </div>
      </div>

      {/* Persistent tab bar — stays across every course tab and highlights the
          active one. Link mode: each tab is a real route, so the items must stay
          anchors (right-click / middle-click / deep links). */}
      <Tabs
        variant="outlined"
        value={activeSegment}
        ariaLabel={t("teacher_common.section_curriculum")}
        linkTo={(segment) => ({
          to: TABS.find((tab) => tab.segment === segment)!.to,
          params: { courseId },
        })}
        tabs={TABS.map((tab) => ({
          key: tab.segment,
          label: t(tab.labelKey),
          icon: tab.icon,
          labelHiddenOnMobile: true,
        }))}
      />

      {/* Active tab renders here.
          Each course tab is its own ROUTE (not a `hidden` tabpanel), so the
          `[role="tabpanel"][data-active="true"] > *` rule in app.css never
          applied here — only question-bank looked animated, and only because it
          hand-rolls `fade-in-up` on its own inner sections. Wrapping the Outlet
          gives every tab the same entrance for free.

          `key` is what makes it re-run: without it React keeps the same DOM node
          across tabs, the animation plays once on mount and never again. Keyed on
          the segment (not the full pathname) so drilling into a sub-page of the
          same tab does not re-trigger it.

          Deliberately NOT `both`/`forwards`: a retained fill would leave a
          `transform` on this wrapper forever, and a transformed ancestor becomes
          the containing block for `position: sticky`/`fixed` descendants — which
          would silently break the `lg:sticky lg:top-24` sidebar in the Students
          tab. `backwards` still hides the pre-animation frame (no flash of
          shifted content) without persisting the transform afterwards.

          opacity+transform only → compositor-only, no reflow. Users with
          prefers-reduced-motion get the near-instant version via the global
          override in app.css. */}
      <div
        key={activeSegment}
        className="animate-[fade-in-up_0.35s_cubic-bezier(0.16,1,0.3,1)_backwards]"
      >
        <Outlet />
      </div>
    </div>
  );
}
