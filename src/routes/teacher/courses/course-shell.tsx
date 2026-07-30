import { useState } from "react";
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Brain,
  ClipboardList,
  GripVertical,
  Library,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useTeacherCourseById,
  useDeleteTeacherCourse,
} from "@/lib/api/hooks/teacher-courses";
import { cn } from "@/lib/utils";

/**
 * Course-scoped layout for the teacher workspace. Renders a persistent header
 * (back link, course title, delete) plus a tab bar that stays put across the
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
  const navigate = useNavigate();
  const location = useLocation();
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  const { data: course } = useTeacherCourseById(courseId);
  const deleteCourse = useDeleteTeacherCourse(courseId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const base = `/teacher/courses/${courseId}`;
  // Determine active tab from the path segment right after the courseId.
  const rest = location.pathname.startsWith(base)
    ? location.pathname.slice(base.length).replace(/^\//, "")
    : "";
  const activeSegment = rest.split("/")[0] ?? "";

  async function handleDeleteCourse() {
    try {
      await deleteCourse.mutateAsync();
      toast.success(t("teacher_course_settings.delete.deleted"));
      setConfirmDelete(false);
      void navigate({ to: "/teacher/courses" });
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || t("teacher_course_settings.delete.failed"),
      );
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link to="/teacher/courses">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-m3-on-surface-variant mb-0.5">
            <Link
              to="/teacher/courses"
              className="hover:text-m3-primary transition-colors"
            >
              {t("teacher_courses_list.title")}
            </Link>
            <ArrowRight className="h-3 w-3" />
            <span className="truncate">{course?.title ?? "…"}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <h1 className="min-w-0 flex-1 text-xl font-headline font-bold text-m3-on-surface truncate">
              {course?.title ?? t("teacher_common.curriculum_fallback_title")}
            </h1>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={deleteCourse.isPending}
              className="shrink-0 gap-2 border-destructive/40 text-destructive transition-all hover:-translate-y-0.5 hover:bg-destructive hover:text-white hover:shadow-md active:translate-y-0 active:scale-95"
            >
              <Trash2 className="h-4 w-4" />
              {t("teacher_course_settings.delete.button")}
            </Button>
          </div>

          {/* Persistent tab bar — stays across every course tab and highlights
              the active one. */}
          <nav className="flex flex-wrap items-center gap-1 mt-3 border-b border-m3-outline-variant/40">
            {TABS.map((tab) => {
              const active = tab.segment === activeSegment;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.key}
                  to={tab.to}
                  params={{ courseId }}
                  className={cn(
                    "flex items-center gap-2 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                    active
                      ? "border-m3-primary text-m3-primary"
                      : "border-transparent text-m3-on-surface-variant hover:text-m3-primary hover:bg-m3-surface-container-low",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t(tab.labelKey)}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Active tab renders here. */}
      <Outlet />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("teacher_course_settings.delete.title")}
        description={t("teacher_course_settings.delete.body", {
          title: course?.title ?? "",
        })}
        confirmLabel={t("teacher_course_settings.delete.button")}
        cancelLabel={t("common.cancel", "Cancel")}
        confirmVariant="destructive"
        onConfirm={handleDeleteCourse}
        isPending={deleteCourse.isPending}
      />
    </div>
  );
}
