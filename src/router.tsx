import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
  Outlet,
} from "@tanstack/react-router";

import { getStoredAuthSession } from "@/lib/auth";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { MfaGate } from "@/components/auth/MfaGate";
import { Toaster } from "sonner";

import LandingPage from "@/routes/landing/landing";
import LoginPage from "@/routes/login/login";
import AuthenticatedLayout from "@/routes/authenticated-layout";
import DashboardPage from "@/routes/dashboard/dashboard";
import GoogleCallbackPage from "@/routes/auth/google-callback";
import CoursesListPage from "@/routes/courses/courses-list";
import CourseDetailPage from "@/routes/courses/course-detail";
import CourseLearnPage from "@/routes/courses/course-learn";
import CourseQuizPage from "@/routes/courses/course-quiz";
import NotificationsPage from "@/routes/notifications/notifications";
import SettingsNotificationsPage from "@/routes/settings/notifications";
import LoginMfaPage from "@/routes/login/mfa";
import SettingsProfilePage from "@/routes/settings/profile";
import SettingsSecurityPage from "@/routes/settings/security";
import SettingsHubPage from "@/routes/settings/settings";
import ProfilePage from "@/routes/profile/profile";
import ProgressPage from "@/routes/progress/progress";
import CareerPathsPage from "@/routes/career-paths/career-paths";
import CareerPathDetailPage from "@/routes/career-paths/career-path-detail";
import MyCareerPathsPage from "@/routes/me/career-paths";
import SrDashboardPage from "@/routes/dashboard/sr-dashboard";
import StudyCardsDuePage from "@/routes/study/cards-due";

/* ── Root layout ── */
function Root() {
  return (
    <AuthProvider>
      <MfaGate>
        <Outlet />
      </MfaGate>
      {/* closeButton: every toast gets a dismiss (X) so it can be collapsed
          on demand — without it a top-right toast sits over the notification
          bell in ContentTopBar and blocks tapping it. offset pushes the stack
          below the 64px (h-16) top bar so it never overlaps the bell/avatar. */}
      <Toaster position="top-right" richColors closeButton offset={72} />
    </AuthProvider>
  );
}

/* ── Route definitions ── */
const rootRoute = createRootRoute({ component: Root });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search.next === "string" ? search.next : undefined,
  }),
  component: LoginPage,
});

const loginMfaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login/mfa",
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search.next === "string" ? search.next : undefined,
  }),
  component: LoginMfaPage,
});

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_authenticated",
  beforeLoad: ({ location }) => {
    const session = getStoredAuthSession();

    if (!session) {
      const next = location.pathname.startsWith("/login")
        ? (new URLSearchParams(location.search).get("next") ?? undefined)
        : location.href;

      throw redirect({
        to: "/login",
        search: { next },
        replace: true,
      });
    }
  },
  component: AuthenticatedLayout,
});

const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const coursesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/courses",
  component: CoursesListPage,
});

const courseDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/courses/$slug",
  component: CourseDetailPage,
});

const courseLearnRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/courses/$slug/learn",
  component: CourseLearnPage,
});

const courseQuizRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/courses/$slug/quiz/$quizId",
  // `?start=1` auto-starts a fresh attempt (used by the review screen's
  // Retry button to jump straight into the taking screen).
  validateSearch: (search: Record<string, unknown>) => ({
    start: search.start === "1" || search.start === 1,
  }),
  component: CourseQuizPage,
});

const courseQuizReviewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/courses/$slug/quiz/$quizId/attempts/$attemptId",
  component: lazyRouteComponent(() => import("@/routes/courses/course-quiz-review")),
});

const courseInterviewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/courses/$slug/interview/$moduleId",
  component: lazyRouteComponent(() => import("@/routes/courses/course-interview")),
});

const progressRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/progress",
  component: ProgressPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/settings",
  component: SettingsHubPage,
});

const profileRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/profile",
  component: ProfilePage,
});

const settingsNotificationsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/settings/notifications",
  component: SettingsNotificationsPage,
});

const settingsProfileRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/settings/profile",
  component: SettingsProfilePage,
});

const settingsSecurityRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/settings/security",
  component: SettingsSecurityPage,
});

const notificationsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/notifications",
  component: NotificationsPage,
});

const teacherRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher",
  component: lazyRouteComponent(() => import("@/routes/teacher/index")),
});

const teacherCoursesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/courses/courses"),
  ),
});

// Course-scoped layout: renders the persistent header + tab bar + <Outlet/>.
// The "tab" routes below nest under it (so switching tabs keeps the bar and
// highlights the active one). Drill-down editors (lesson/module/quiz/student
// detail) stay siblings under authenticatedRoute for a full-screen view.
const teacherCourseManageRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/courses/course-shell"),
  ),
});

const teacherCourseCurriculumRoute = createRoute({
  getParentRoute: () => teacherCourseManageRoute,
  path: "/",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/courses/course-manage"),
  ),
});

const teacherCourseStudentsRoute = createRoute({
  getParentRoute: () => teacherCourseManageRoute,
  path: "students",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/courses/course-students"),
  ),
});

const teacherCourseProgressRoute = createRoute({
  getParentRoute: () => teacherCourseManageRoute,
  path: "progress",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/courses/course-progress"),
  ),
});

const teacherCourseAssessmentsRoute = createRoute({
  getParentRoute: () => teacherCourseManageRoute,
  path: "assessments",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/courses/course-assessments"),
  ),
});

const teacherCourseQuestionBankRoute = createRoute({
  getParentRoute: () => teacherCourseManageRoute,
  path: "question-bank",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/courses/course-question-bank"),
  ),
});

const teacherSrCohortRoute = createRoute({
  getParentRoute: () => teacherCourseManageRoute,
  path: "sr-cohort",
  component: lazyRouteComponent(() => import("@/routes/teacher/sr-cohort")),
});

const teacherLessonManageRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/lessons/$lessonId",
  component: lazyRouteComponent(() => import("@/routes/teacher/lesson-manage")),
});

/* lesson-materials route removed: the AI Material Hub is now folded into the
   lesson-manage page as the inline "Material history" + "Knowledge Graph"
   sections. */

const teacherModuleManageRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/modules/$moduleId",
  component: lazyRouteComponent(() => import("@/routes/teacher/module-manage")),
});

const teacherQuizManageRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/quizzes/$quizId",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/quiz/quiz-manage"),
  ),
});

const teacherQuizGenerateRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/quizzes/$quizId/generate",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/quiz/quiz-generate"),
  ),
});

const teacherQuizResultsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/quizzes/$quizId/results",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/quiz/quiz-results"),
  ),
});

const teacherInterviewConfigRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/interview-configs/$configId",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/interview-config"),
  ),
});

const teacherInterviewGapReportRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/interview-sessions/$sessionId/gap-report",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/interview-gap-report"),
  ),
});

const teacherCourseStudentDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/students/$studentId",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/courses/course-student-detail"),
  ),
});

const adminHealthRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/health",
  component: lazyRouteComponent(() => import("@/routes/admin/health")),
});

const adminSettingsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/settings",
  component: lazyRouteComponent(() => import("@/routes/admin/settings")),
});

const adminStatsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/stats",
  component: lazyRouteComponent(() => import("@/routes/admin/stats")),
});

const adminStatsActiveRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/stats/active",
  component: lazyRouteComponent(() => import("@/routes/admin/stats-active")),
});

const adminStatsContentRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/stats/content",
  component: lazyRouteComponent(() => import("@/routes/admin/stats-content")),
});

const adminStatsHealthRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/stats/health",
  component: lazyRouteComponent(() => import("@/routes/admin/stats-health")),
});

const adminUsersRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/users",
  component: lazyRouteComponent(() => import("@/routes/admin/users")),
});

const adminUserDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/users/$userId",
  component: lazyRouteComponent(() => import("@/routes/admin/user-detail")),
});

const adminOrganizationsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/organizations",
  component: lazyRouteComponent(() => import("@/routes/admin/organizations")),
});

const adminOrganizationDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/organizations/$orgId",
  component: lazyRouteComponent(
    () => import("@/routes/admin/organization-detail"),
  ),
});

const adminCoursesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/courses",
  component: lazyRouteComponent(() => import("@/routes/admin/courses")),
});

const adminCourseDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/courses/$courseId",
  component: lazyRouteComponent(() => import("@/routes/admin/course-detail")),
});

const adminProcessingRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/processing",
  component: lazyRouteComponent(() => import("@/routes/admin/processing")),
});

const adminProcessingJobRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/processing/$jobId",
  component: lazyRouteComponent(() => import("@/routes/admin/processing-job")),
});

const adminAiCostsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/ai-costs",
  component: lazyRouteComponent(() => import("@/routes/admin/ai-costs")),
});

const adminAuditLogsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/audit-logs",
  component: lazyRouteComponent(() => import("@/routes/admin/audit-logs")),
});

const deptCoursesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dept",
  // Optional ?unit= — the org tree links here to scope the list to one
  // org unit and everything below it.
  validateSearch: (search: Record<string, unknown>): { unit?: string } => ({
    unit: typeof search.unit === "string" ? search.unit : undefined,
  }),
  component: lazyRouteComponent(() => import("@/routes/dept/courses")),
});

const deptCourseDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dept/courses/$courseId",
  // Optional ?tab= — the worklist's "Teachers" action deep-links here with
  // tab=teachers so it lands on the teachers tab instead of duplicating the
  // row click (which relies on the default tab).
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  component: lazyRouteComponent(() => import("@/routes/dept/course-detail")),
});

const managementCourseNewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/management/courses/new",
  // Optional career-path context. When a manager starts here from a stage's
  // "New course" button, the created course is attached to that stage
  // immediately and we return to the path — otherwise a brand-new course sits
  // on no path at all, which is exactly the readiness gap this closes.
  //
  // The return type is spelled with optional keys rather than inferred: an
  // inferred `{pathId: string | undefined}` makes `search` a REQUIRED prop on
  // every <Link> to this route, which broke the two plain links on
  // dept-courses.tsx that legitimately pass nothing.
  validateSearch: (
    search: Record<string, unknown>,
  ): { pathId?: string; stageId?: string } => ({
    pathId: typeof search.pathId === "string" ? search.pathId : undefined,
    stageId: typeof search.stageId === "string" ? search.stageId : undefined,
  }),
  component: lazyRouteComponent(() => import("@/routes/management/course-new")),
});

const managementCourseEnrollmentsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/management/courses/$courseId/enrollments",
  component: lazyRouteComponent(
    () => import("@/routes/management/course-enrollments"),
  ),
});

const managementEnrolmentRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/management/enrolment",
  component: lazyRouteComponent(() => import("@/routes/management/enrolment")),
});

const careerPathsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/career-paths",
  component: CareerPathsPage,
});

const careerPathDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/career-paths/$slug",
  component: CareerPathDetailPage,
});

const myCareerPathsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/me/career-paths",
  component: MyCareerPathsPage,
});

const learningProgramsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/learning-programs",
  component: lazyRouteComponent(() => import("@/routes/learning-programs/learning-programs")),
});

const myInterviewsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/me/interviews",
  // Optional filter: when a student opens the list from an interview lobby,
  // we carry the config id so the list shows only that interview's attempts.
  validateSearch: (search: Record<string, unknown>) => ({
    config: typeof search.config === "string" ? search.config : undefined,
  }),
  component: lazyRouteComponent(() => import("@/routes/me/interviews")),
});

const myInterviewResultRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/me/interviews/$sessionId",
  // Optional deep-link origin: when a student opens an old attempt from the
  // interview lobby, we carry the course slug + module id so "Back" returns to
  // that lobby instead of the generic /me/interviews list.
  validateSearch: (search: Record<string, unknown>) => ({
    from: typeof search.from === "string" ? search.from : undefined,
    course: typeof search.course === "string" ? search.course : undefined,
    module: typeof search.module === "string" ? search.module : undefined,
  }),
  component: lazyRouteComponent(() => import("@/routes/me/interview-result")),
});

const managementCareerPathsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/management/career-paths",
  component: lazyRouteComponent(
    () => import("@/routes/management/career-paths"),
  ),
});

const managementLearningProgramsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/management/learning-programs",
  component: lazyRouteComponent(
    () => import("@/routes/management/learning-programs"),
  ),
});

const managementLearningProgramDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/management/learning-programs/$id",
  component: lazyRouteComponent(
    () => import("@/routes/management/learning-program-detail"),
  ),
});

const managementLearningProgramNewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/management/learning-programs/new",
  component: lazyRouteComponent(
    () => import("@/routes/management/learning-program-new"),
  ),
});

const managementCareerPathDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/management/career-paths/$id",
  component: lazyRouteComponent(
    () => import("@/routes/management/career-path-detail"),
  ),
});

const managementOrgUnitsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/management/org-units",
  component: lazyRouteComponent(() => import("@/routes/management/org-units")),
});

const managementUsersRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/management/users",
  // Optional ?unit= — the org tree links here to scope the list to one
  // org unit and everything below it.
  validateSearch: (search: Record<string, unknown>): { unit?: string } => ({
    unit: typeof search.unit === "string" ? search.unit : undefined,
  }),
  component: lazyRouteComponent(() => import("@/routes/management/users")),
});

const managementUserDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/management/users/$userId",
  component: lazyRouteComponent(
    () => import("@/routes/management/user-detail"),
  ),
});

const srDashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dashboard/sr",
  component: SrDashboardPage,
});

const studyCardsDueRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/study/cards-due",
  // `lesson` (UUID) scopes the list to one lesson — used by the SR reminder
  // deep-link (`/study/cards-due?lesson={id}`). `course` (slug) scopes to one
  // course. Both optional; omit for the full backlog.
  validateSearch: (search: Record<string, unknown>) => ({
    lesson: typeof search.lesson === "string" ? search.lesson : undefined,
    course: typeof search.course === "string" ? search.course : undefined,
  }),
  component: StudyCardsDuePage,
});

const studyReviewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/study/review",
  // Scope the review session to one lesson or course; omit for everything.
  validateSearch: (search: Record<string, unknown>) => ({
    lesson: typeof search.lesson === "string" ? search.lesson : undefined,
    course: typeof search.course === "string" ? search.course : undefined,
  }),
  component: lazyRouteComponent(() => import("@/routes/study/review")),
});

const teacherSrAtRiskRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/at-risk",
  component: lazyRouteComponent(() => import("@/routes/teacher/sr-at-risk")),
});

const teacherCourseQuizAttemptDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/quiz-attempts/$attemptId",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/courses/course-quiz-attempt-detail"),
  ),
});

const teacherSrStudentDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/students/$studentId/sr",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/sr-student-detail"),
  ),
});

const callbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth/google/callback",
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : null,
    state: typeof search.state === "string" ? search.state : null,
    error: typeof search.error === "string" ? search.error : null,
  }),
  component: GoogleCallbackPage,
});

/* Public help + policy. Deliberately children of rootRoute rather than
   authenticatedRoute: a user who cannot sign in is exactly who needs /help, and
   the terms must be readable before creating an account. */
const helpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/help",
  component: lazyRouteComponent(() => import("@/routes/support/help")),
});

const policyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/policy/$slug",
  component: lazyRouteComponent(() => import("@/routes/support/policy")),
});

/* ── Route tree ── */
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  loginMfaRoute,
  helpRoute,
  policyRoute,
  authenticatedRoute.addChildren([
    dashboardRoute,
    coursesRoute,
    courseDetailRoute,
    courseLearnRoute,
    courseQuizRoute,
    courseQuizReviewRoute,
    courseInterviewRoute,
    progressRoute,
    settingsRoute,
    profileRoute,
    settingsNotificationsRoute,
    settingsProfileRoute,
    settingsSecurityRoute,
    notificationsRoute,
    teacherRoute,
    teacherCoursesRoute,
    teacherCourseManageRoute.addChildren([
      teacherCourseCurriculumRoute,
      teacherCourseStudentsRoute,
      teacherCourseProgressRoute,
      teacherCourseAssessmentsRoute,
      teacherCourseQuestionBankRoute,
      teacherSrCohortRoute,
    ]),
    teacherLessonManageRoute,
    teacherModuleManageRoute,
    teacherQuizManageRoute,
    teacherQuizGenerateRoute,
    teacherQuizResultsRoute,
    teacherInterviewConfigRoute,
    teacherInterviewGapReportRoute,
    teacherCourseStudentDetailRoute,
    adminHealthRoute,
    adminSettingsRoute,
    adminStatsRoute,
    adminStatsActiveRoute,
    adminStatsContentRoute,
    adminStatsHealthRoute,
    adminUsersRoute,
    adminUserDetailRoute,
    adminOrganizationsRoute,
    adminOrganizationDetailRoute,
    adminCoursesRoute,
    adminCourseDetailRoute,
    adminProcessingRoute,
    adminProcessingJobRoute,
    adminAiCostsRoute,
    adminAuditLogsRoute,
    deptCoursesRoute,
    deptCourseDetailRoute,
    managementCourseNewRoute,
    managementCourseEnrollmentsRoute,
    managementEnrolmentRoute,
    careerPathsRoute,
    careerPathDetailRoute,
    myCareerPathsRoute,
    learningProgramsRoute,
    myInterviewsRoute,
    myInterviewResultRoute,
    managementCareerPathsRoute,
    managementLearningProgramsRoute,
    managementLearningProgramNewRoute,
    managementLearningProgramDetailRoute,
    managementOrgUnitsRoute,
    managementCareerPathDetailRoute,
    managementUsersRoute,
    managementUserDetailRoute,
    srDashboardRoute,
    studyCardsDueRoute,
    studyReviewRoute,
    teacherSrAtRiskRoute,
    teacherCourseQuizAttemptDetailRoute,
    teacherSrStudentDetailRoute,
  ]),
  callbackRoute,
]);

export const router = createRouter({
  routeTree,
  // Without a default error component, any uncaught render error in a route
  // blanks the whole app to a white screen. This catches it per-route and
  // shows a readable fallback + the actual error message.
  defaultErrorComponent: RouteErrorBoundary,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
