/**
 * Centralized query-key namespace for TanStack Query.
 *
 * Convention: ['<domain>', '<entity>', ...args]
 *
 * All hooks MUST use these factories — never inline string arrays.
 * See docs/frontend-cutover/qc-conventions.md for full rationale.
 */

export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
    permissions: () => ["auth", "permissions"] as const,
    mfaStatus: () => ["auth", "mfa", "status"] as const,
  },

  courses: {
    list: (cursor?: string) => ["courses", "list", cursor] as const,
    myList: (cursor?: string) => ["courses", "my", cursor] as const,
    detail: (id: string) => ["courses", "detail", id] as const,
    bySlug: (slug: string) => ["courses", "by-slug", slug] as const,
    content: (id: string) => ["courses", "content", id] as const,
    tags: (id: string) => ["courses", "tags", id] as const,
    outcomes: (id: string) => ["courses", "outcomes", id] as const,
    teacherOutcomes: (id: string) =>
      ["courses", "teacher-outcomes", id] as const,
    modules: (id: string) => ["courses", "modules", id] as const,
    moduleDetail: (id: string) => ["courses", "module-detail", id] as const,
    moduleItems: (id: string) => ["courses", "module-items", id] as const,
    moduleLessons: (id: string) => ["courses", "module-lessons", id] as const,
    moduleLessonsAuthoring: (id: string) =>
      ["courses", "module-lessons-authoring", id] as const,
    lesson: (id: string) => ["courses", "lesson", id] as const,
    lessonResources: (id: string) =>
      ["courses", "lesson-resources", id] as const,
    resourceDownload: (id: string) =>
      ["courses", "resource-download", id] as const,
  },

  materials: {
    detail: (id: string) => ["materials", "detail", id] as const,
    streamUrl: (id: string) => ["materials", "stream-url", id] as const,
    chunksPreview: (id: string, limit?: number) =>
      ["materials", "chunks-preview", id, limit] as const,
    processing: (id: string) => ["materials", "processing", id] as const,
    versions: (id: string) => ["materials", "versions", id] as const,
  },

  notifications: {
    inbox: (cursor?: string) => ["notifications", "inbox", cursor] as const,
    unreadCount: () => ["notifications", "unread-count"] as const,
    preferences: () => ["notifications", "preferences"] as const,
  },

  discussions: {
    topics: (lessonId: string) => ["discussions", "topics", lessonId] as const,
    comments: (topicId: string) =>
      ["discussions", "comments", topicId] as const,
  },

  sr: {
    dashboardSummary: () => ["sr", "dashboard-summary"] as const,
    cardsDue: (lessonId?: string, limit?: number, courseSlug?: string) =>
      ["sr", "cards-due", lessonId, limit, courseSlug] as const,
    reviewQueue: (lessonId?: string, limit?: number, courseSlug?: string) =>
      ["sr", "review-queue", lessonId, limit, courseSlug] as const,
    lessonSummary: (lessonId: string) =>
      ["sr", "lesson-summary", lessonId] as const,
    courseOverview: (courseId: string) =>
      ["sr", "course-overview", courseId] as const,
    cohortKr: (courseId: string, lessonId: string) =>
      ["sr", "cohort-kr", courseId, lessonId] as const,
    difficultCards: (courseId: string, lessonId: string, topN: number) =>
      ["sr", "difficult-cards", courseId, lessonId, topN] as const,
    atRisk: (courseId: string) => ["sr", "at-risk", courseId] as const,
    cardStudentResults: (courseId: string, questionId: string) =>
      ["sr", "card-student-results", courseId, questionId] as const,
    studentDetail: (courseId: string, studentId: string) =>
      ["sr", "student-detail", courseId, studentId] as const,
  },

  admin: {
    statsOverview: () => ["admin", "stats", "overview"] as const,
    dashboard: () => ["admin", "stats", "dashboard"] as const,
    activeUsers: () => ["admin", "stats", "active-users"] as const,
    content: () => ["admin", "stats", "content"] as const,
    statsHealth: (since: string) =>
      ["admin", "stats", "health", since] as const,
    users: (cursor?: string) => ["admin", "users", cursor] as const,
    userDetail: (id: string) => ["admin", "users", "detail", id] as const,
    courses: (includeDeleted?: boolean, cursor?: string) =>
      ["admin", "courses", includeDeleted ?? true, cursor] as const,
    courseAudit: (courseId: string) =>
      ["admin", "courses", courseId, "audit"] as const,
    courseProcessing: (courseId: string, limit?: number) =>
      ["admin", "courses", courseId, "processing", limit] as const,
    courseStats: () => ["admin", "courses", "stats"] as const,
    processingQueue: () => ["admin", "processing", "queue"] as const,
    processingSummary: (since: string, until?: string) =>
      ["admin", "processing", "summary", since, until ?? ""] as const,
    processingJobs: (status?: string, since?: string, until?: string) =>
      ["admin", "processing", "jobs", status, since, until ?? ""] as const,
    processingJob: (jobId: string) =>
      ["admin", "processing", "jobs", "detail", jobId] as const,
    permissions: () => ["admin", "permissions"] as const,
    roles: () => ["admin", "roles"] as const,
    userAssignments: (userId: string) =>
      ["admin", "users", userId, "assignments"] as const,
    userGrants: (userId: string) =>
      ["admin", "users", userId, "grants"] as const,
    orgMemberships: (orgId: string) =>
      ["admin", "organizations", orgId, "memberships"] as const,
    auditRoleChanges: (since: string) =>
      ["admin", "audit", "role-changes", since] as const,
    auditHttp: (since: string, path?: string, userId?: string) =>
      ["admin", "audit", "http", since, path, userId] as const,
    auditDataChanges: (table: string, entityId: string) =>
      ["admin", "audit", "data-changes", table, entityId] as const,
    aiCosts: {
      summary: (period: string, filters?: string) =>
        ["admin", "ai-costs", "summary", period, filters ?? ""] as const,
      byUser: (topN: number, period: string) =>
        ["admin", "ai-costs", "by-user", topN, period] as const,
      byPipeline: (period: string) =>
        ["admin", "ai-costs", "by-pipeline", period] as const,
      byCategory: (dimension: string, period: string, filters?: string) =>
        [
          "admin",
          "ai-costs",
          "by-category",
          dimension,
          period,
          filters ?? "",
        ] as const,
      byModel: (period: string, filters?: string) =>
        ["admin", "ai-costs", "by-model", period, filters ?? ""] as const,
      recent: (limit: number) =>
        ["admin", "ai-costs", "recent", limit] as const,
    },
    aiPricing: () => ["admin", "ai-pricing"] as const,
    organizations: (
      includeDeleted?: boolean,
      orgStatus?: string,
      limit?: number,
    ) =>
      [
        "admin",
        "organizations",
        includeDeleted ?? false,
        orgStatus,
        limit,
      ] as const,
    organizationDetail: (id: string) =>
      ["admin", "organizations", "detail", id] as const,
    organizationDomains: (orgId: string) =>
      ["admin", "organizations", orgId, "domains"] as const,
    organizationUnits: (
      orgId: string,
      parentUnitId?: string | null,
      onlyRoots?: boolean,
    ) =>
      [
        "admin",
        "organizations",
        orgId,
        "units",
        parentUnitId,
        onlyRoots ?? false,
      ] as const,
    organizationMemberships: (orgId: string) =>
      ["admin", "organizations", orgId, "memberships"] as const,
    orgUnitDetail: (id: string) =>
      ["admin", "org-units", "detail", id] as const,
  },

  dept: {
    courses: () => ["dept", "courses"] as const,
    teachers: (courseId: string) =>
      ["dept", "courses", courseId, "teachers"] as const,
    assignableTeachers: (courseId: string) =>
      ["dept", "courses", courseId, "assignable-teachers"] as const,
    readiness: (courseId: string) =>
      ["dept", "courses", courseId, "readiness"] as const,
    /** Teacher picker for a course that does not exist yet (create wizard). */
    assignableTeachersForNew: () =>
      ["dept", "assignable-teachers", "new"] as const,
    roster: (courseId: string) =>
      ["dept", "courses", courseId, "roster"] as const,
    orgUnitCourses: (orgUnitId: string) =>
      ["dept", "org-units", orgUnitId, "courses"] as const,
  },

  infra: {
    healthz: () => ["infra", "healthz"] as const,
    readyz: () => ["infra", "readyz"] as const,
  },

  // --- Stubs for future domains (Wave 1+) ---

  quizzes: {
    list: (courseId: string) => ["quizzes", "list", courseId] as const,
    detail: (id: string) => ["quizzes", "detail", id] as const,
    attempt: (attemptId: string) => ["quizzes", "attempt", attemptId] as const,
    myAttempts: (quizId: string) => ["quizzes", "my-attempts", quizId] as const,
    attemptProgress: (attemptId: string) =>
      ["quizzes", "attempt-progress", attemptId] as const,
    authoring: (quizId: string) => ["quizzes", "authoring", quizId] as const,
    questions: (quizId: string) => ["quizzes", "questions", quizId] as const,
    generationRun: (quizId: string, runId: string) =>
      ["quizzes", "gen-run", quizId, runId] as const,
    latestGenerationRun: (quizId: string) =>
      ["quizzes", "gen-run", quizId, "latest"] as const,
    bank: (
      courseId: string,
      filters?: {
        moduleId?: string;
        lessonId?: string;
        questionType?: string;
        bloomLevel?: string;
        difficulty?: string;
        reviewStatus?: string;
        search?: string;
        excludeQuizId?: string;
      },
    ) => ["quizzes", "bank", courseId, filters ?? {}] as const,
    courseAttempts: (courseId: string) =>
      ["quizzes", "course-attempts", courseId] as const,
    studentAttempts: (courseId: string, studentId: string) =>
      ["quizzes", "student-attempts", courseId, studentId] as const,
    attemptDetail: (courseId: string, attemptId: string) =>
      ["quizzes", "attempt-detail", courseId, attemptId] as const,
    results: (quizId: string) => ["quizzes", "results", quizId] as const,
    progress: (courseId: string) =>
      ["quizzes", "course-progress", courseId] as const,
    // --- Moodle-parity phases (backend 0044-0057) ---
    regradeRun: (quizId: string, runId: string) =>
      ["quizzes", "regrade-run", quizId, runId] as const,
    overrides: (quizId: string) => ["quizzes", "overrides", quizId] as const,
    feedbackBands: (quizId: string) =>
      ["quizzes", "feedback-bands", quizId] as const,
    gradebook: (quizId: string) => ["quizzes", "gradebook", quizId] as const,
    needsGrading: (quizId: string) =>
      ["quizzes", "needs-grading", quizId] as const,
    responsesReport: (quizId: string) =>
      ["quizzes", "report-responses", quizId] as const,
    statisticsReport: (quizId: string) =>
      ["quizzes", "report-statistics", quizId] as const,
    auditEvents: (quizId: string) =>
      ["quizzes", "audit-events", quizId] as const,
  },

  interviews: {
    list: (cursor?: string) => ["interviews", "list", cursor] as const,
    detail: (id: string) => ["interviews", "detail", id] as const,
    practice: (id: string) => ["interviews", "practice", id] as const,
    practiceFeedback: (sessionId: string) =>
      ["interviews", "practice-feedback", sessionId] as const,
    session: (sessionId: string) =>
      ["interviews", "session", sessionId] as const,
    mySessions: () => ["interviews", "my-sessions"] as const,
    progress: (courseId: string) =>
      ["interviews", "progress", courseId] as const,
    gapReport: (sessionId: string) =>
      ["interviews", "gap-report", sessionId] as const,
    configAuthoring: (configId: string) =>
      ["interviews", "config-authoring", configId] as const,
    adaptiveReadiness: (configId: string) =>
      ["interviews", "adaptive-readiness", configId] as const,
    teacherGapReport: (sessionId: string) =>
      ["interviews", "teacher-gap-report", sessionId] as const,
    questionBank: (courseId: string) =>
      ["interviews", "question-bank", courseId] as const,
    generationRun: (configId: string, runId: string) =>
      ["interviews", "generation-run", configId, runId] as const,
    teacherSession: (sessionId: string) =>
      ["interviews", "teacher-session", sessionId] as const,
    configSessions: (configId: string) =>
      ["interviews", "config-sessions", configId] as const,
    transcript: (sessionId: string) =>
      ["interviews", "transcript", sessionId] as const,
    integrityEvents: (sessionId: string) =>
      ["interviews", "integrity-events", sessionId] as const,
    courseSessions: (courseId: string) =>
      ["interviews", "course-sessions", courseId] as const,
    studentSessions: (courseId: string, studentId: string) =>
      ["interviews", "student-sessions", courseId, studentId] as const,
  },

  enrollments: {
    list: (courseId: string) => ["enrollments", "list", courseId] as const,
    invitationCodes: (courseId: string) =>
      ["enrollments", "invitation-codes", courseId] as const,
    detail: (id: string) => ["enrollments", "detail", id] as const,
  },

  progress: {
    course: (courseId: string) => ["progress", "course", courseId] as const,
    lesson: (lessonId: string) => ["progress", "lesson", lessonId] as const,
    myCourse: (courseId: string) =>
      ["progress", "my-course", courseId] as const,
    cohort: (courseId: string) => ["progress", "cohort", courseId] as const,
    atRiskRoster: (courseId: string) =>
      ["progress", "at-risk", courseId] as const,
  },

  me: {
    enrollments: () => ["me", "enrollments"] as const,
    enrollment: (courseId: string) => ["me", "enrollments", courseId] as const,
  },

  careerPaths: {
    list: () => ["career-paths", "list"] as const,
    bySlug: (slug: string) => ["career-paths", "by-slug", slug] as const,
    myEnrollments: () => ["career-paths", "my-enrollments"] as const,
    progress: (cpId: string) => ["career-paths", "progress", cpId] as const,
    managementList: (orgId: string, includeArchived?: boolean) =>
      ["career-paths", "mgmt-list", orgId, includeArchived ?? false] as const,
    managementDetail: (id: string) =>
      ["career-paths", "mgmt-detail", id] as const,
    managementCourses: (id: string) =>
      ["career-paths", "mgmt-courses", id] as const,
    managementStages: (id: string) =>
      ["career-paths", "mgmt-stages", id] as const,
    teacherProgress: (id: string) =>
      ["career-paths", "teacher-progress", id] as const,
    readiness: (id: string) => ["career-paths", "readiness", id] as const,
  },
} as const;
