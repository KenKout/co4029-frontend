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

import LandingPage from "@/routes/landing";
import LoginPage from "@/routes/login";
import AuthenticatedLayout from "@/routes/authenticated-layout";
import DashboardPage from "@/routes/dashboard";
import GoogleCallbackPage from "@/routes/google-callback";
import CoursesListPage from "@/routes/courses-list";
import CourseDetailPage from "@/routes/course-detail";
import CourseLearnPage from "@/routes/course-learn";
import CourseQuizPage from "@/routes/course-quiz";
import NotificationsPage from "@/routes/notifications";
import SettingsNotificationsPage from "@/routes/settings-notifications";
import LoginMfaPage from "@/routes/login-mfa";
import SettingsProfilePage from "@/routes/settings-profile";
import SettingsSecurityPage from "@/routes/settings-security";
import SettingsHubPage from "@/routes/settings";
import ProfilePage from "@/routes/profile";
import ProgressPage from "@/routes/progress";
import CareerPathsPage from "@/routes/career-paths";
import CareerPathDetailPage from "@/routes/career-path-detail";
import MyCareerPathsPage from "@/routes/me-career-paths";
import SrDashboardPage from "@/routes/sr-dashboard";
import StudyCardsDuePage from "@/routes/study-cards-due";

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
  component: CourseQuizPage,
});

const courseQuizReviewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/courses/$slug/quiz/$quizId/attempts/$attemptId",
  component: lazyRouteComponent(() => import("@/routes/course-quiz-review")),
});

const courseInterviewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/courses/$slug/interview/$moduleId",
  component: lazyRouteComponent(() => import("@/routes/course-interview")),
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

const teacherCourseManageRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/courses/course-manage"),
  ),
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

const teacherStudentsHubRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/students",
  component: lazyRouteComponent(() => import("@/routes/teacher/students-hub")),
});

const teacherCourseStudentsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/students",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/courses/course-students"),
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
  component: lazyRouteComponent(() => import("@/routes/dept-courses")),
});

const deptCourseDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/dept/courses/$courseId",
  component: lazyRouteComponent(() => import("@/routes/dept-course-detail")),
});

const managementCourseEnrollmentsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/management/courses/$courseId/enrollments",
  component: lazyRouteComponent(
    () => import("@/routes/management-course-enrollments"),
  ),
});

const managementEnrolmentRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/management/enrolment",
  component: lazyRouteComponent(() => import("@/routes/management-enrolment")),
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

const myInterviewsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/me/interviews",
  component: lazyRouteComponent(() => import("@/routes/me-interviews")),
});

const myInterviewResultRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/me/interviews/$sessionId",
  component: lazyRouteComponent(() => import("@/routes/me-interview-result")),
});

const managementCareerPathsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/management/career-paths",
  component: lazyRouteComponent(
    () => import("@/routes/management-career-paths"),
  ),
});

const managementCareerPathDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/management/career-paths/$id",
  component: lazyRouteComponent(
    () => import("@/routes/management-career-path-detail"),
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
  component: StudyCardsDuePage,
});

const studyReviewRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/study/review",
  component: lazyRouteComponent(() => import("@/routes/study-review")),
});

const teacherSrCohortRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/sr-cohort",
  component: lazyRouteComponent(() => import("@/routes/teacher/sr-cohort")),
});

const teacherSrAtRiskRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/at-risk",
  component: lazyRouteComponent(() => import("@/routes/teacher/sr-at-risk")),
});

const teacherCourseProgressRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/progress",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/courses/course-progress"),
  ),
});

const teacherCourseAssessmentsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/assessments",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/courses/course-assessments"),
  ),
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

const teacherCourseQuestionBankRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/teacher/courses/$courseId/question-bank",
  component: lazyRouteComponent(
    () => import("@/routes/teacher/courses/course-question-bank"),
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
  component: lazyRouteComponent(() => import("@/routes/help")),
});

const policyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/policy/$slug",
  component: lazyRouteComponent(() => import("@/routes/policy")),
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
    teacherCourseManageRoute,
    teacherLessonManageRoute,
    teacherModuleManageRoute,
    teacherQuizManageRoute,
    teacherQuizGenerateRoute,
    teacherQuizResultsRoute,
    teacherInterviewConfigRoute,
    teacherInterviewGapReportRoute,
    teacherStudentsHubRoute,
    teacherCourseStudentsRoute,
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
    managementCourseEnrollmentsRoute,
    managementEnrolmentRoute,
    careerPathsRoute,
    careerPathDetailRoute,
    myCareerPathsRoute,
    myInterviewsRoute,
    myInterviewResultRoute,
    managementCareerPathsRoute,
    managementCareerPathDetailRoute,
    srDashboardRoute,
    studyCardsDueRoute,
    studyReviewRoute,
    teacherSrCohortRoute,
    teacherSrAtRiskRoute,
    teacherCourseProgressRoute,
    teacherCourseAssessmentsRoute,
    teacherCourseQuizAttemptDetailRoute,
    teacherSrStudentDetailRoute,
    teacherCourseQuestionBankRoute,
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
