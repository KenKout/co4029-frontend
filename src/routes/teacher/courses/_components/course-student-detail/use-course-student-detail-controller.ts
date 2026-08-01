import { useNavigate, useParams } from "@tanstack/react-router";

import { useStudentInterviewSessions } from "@/lib/api/hooks/interviews";
import { useStudentQuizAttempts } from "@/lib/api/hooks/quizzes";
import {
  useTeacherCourseById,
  useTeacherCourseRoster,
} from "@/lib/api/hooks/teacher-courses";
import type { RosterStudent } from "@/lib/api/types/teacher";

import {
  useStudentInterviewFilters,
  type StudentInterviewFiltersController,
} from "./use-student-interview-filters";

/** Each query's payload exactly as the page's own hooks hand it out. */
export type CourseDetailData = ReturnType<typeof useTeacherCourseById>["data"];
export type StudentQuizAttempts = ReturnType<
  typeof useStudentQuizAttempts
>["data"];
export type StudentInterviewSessions = ReturnType<
  typeof useStudentInterviewSessions
>["data"];

/**
 * Route params, the four queries and the interview filters of the per-student
 * detail page, extracted from the former 659-line course-student-detail.tsx.
 * The hook sequence is unchanged: params, navigate, the four queries, then the
 * interview filters (three `useState` + three `useMemo`) — all still ahead of
 * the page's loading / not-found early returns.
 */
export interface CourseStudentDetailController {
  courseId: string;
  studentId: string;
  navigate: ReturnType<typeof useNavigate>;
  course: CourseDetailData;
  isLoading: boolean;
  student: RosterStudent | undefined;
  quizAttempts: StudentQuizAttempts;
  quizAttemptsLoading: boolean;
  interviewSessions: StudentInterviewSessions;
  interviewSessionsLoading: boolean;
  filters: StudentInterviewFiltersController;
}

export function useCourseStudentDetailController(): CourseStudentDetailController {
  const { courseId, studentId } = useParams({ strict: false }) as {
    courseId: string;
    studentId: string;
  };

  const navigate = useNavigate();
  const { data: course } = useTeacherCourseById(courseId);
  const { data: roster, isLoading } = useTeacherCourseRoster(courseId);
  const { data: quizAttempts, isLoading: quizAttemptsLoading } =
    useStudentQuizAttempts(courseId, studentId);
  const { data: interviewSessions, isLoading: interviewSessionsLoading } =
    useStudentInterviewSessions(courseId, studentId);

  const filters = useStudentInterviewFilters(interviewSessions);

  const student = roster?.students.find((s) => s.student_id === studentId);

  return {
    courseId,
    studentId,
    navigate,
    course,
    isLoading,
    student,
    quizAttempts,
    quizAttemptsLoading,
    interviewSessions,
    interviewSessionsLoading,
    filters,
  };
}
