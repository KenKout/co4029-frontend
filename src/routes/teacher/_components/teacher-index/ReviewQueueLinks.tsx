import { Link } from "@tanstack/react-router";

import type { ReviewQueueItem, ReviewQueueKind } from "@/lib/api/hooks/teacher-courses";

/**
 * Deep link for one review-queue drill-down item.
 *
 * Each kind renders its own `<Link>` with a LITERAL route path —
 * returning `{ to, params }` from a shared helper collapses the three
 * shapes into a union, which defeats TanStack's route typing and forces
 * an `as any` cast. The router IS registered (`declare module … Register`
 * in router.tsx), so written this way a typo or a renamed route is a
 * compile error rather than a dead link discovered by a user.
 *
 * Shared by the "Needs your review" section and the Priority Today
 * drill-downs so both land on the exact same destination:
 *
 *   quiz-cards          → the quiz page, Questions tab (approve/edit cards)
 *   interview-questions → the interview config page, Questions tab (the
 *                         pending work lives there, NOT the Settings tab
 *                         the page opens on by default)
 *   materials           → the LESSON page (quiz generation is keyed on the
 *                         lesson, and no quiz exists yet to link to)
 *   missing-texp        → the quiz page, Questions tab (bulk-set expected
 *                         response times)
 */
export function ReviewItemLink({
  kind,
  item,
  children,
}: {
  kind: ReviewQueueKind;
  item: ReviewQueueItem;
  children: React.ReactNode;
}) {
  const linkClass =
    "flex items-center justify-between gap-3 py-2.5 pl-12 pr-5 transition-colors hover:bg-m3-surface-container-low";

  switch (kind) {
    case "quiz-cards":
      return (
        <Link
          to="/teacher/courses/$courseId/quizzes/$quizId"
          params={{ courseId: item.course_id, quizId: item.target_id }}
          search={{ tab: "questions" }}
          className={linkClass}
        >
          {children}
        </Link>
      );
    case "interview-questions":
      return (
        <Link
          to="/teacher/courses/$courseId/interview-configs/$configId"
          params={{ courseId: item.course_id, configId: item.target_id }}
          search={{ tab: "questions" }}
          className={linkClass}
        >
          {children}
        </Link>
      );
    case "materials":
      return (
        <Link
          to="/teacher/courses/$courseId/lessons/$lessonId"
          params={{ courseId: item.course_id, lessonId: item.target_id }}
          className={linkClass}
        >
          {children}
        </Link>
      );
    case "missing-texp":
      // Same destination as quiz-cards: the quiz page, where the teacher
      // bulk-sets expected response times on the questions tab.
      return (
        <Link
          to="/teacher/courses/$courseId/quizzes/$quizId"
          params={{ courseId: item.course_id, quizId: item.target_id }}
          search={{ tab: "questions" }}
          className={linkClass}
        >
          {children}
        </Link>
      );
  }
}

export default ReviewItemLink;