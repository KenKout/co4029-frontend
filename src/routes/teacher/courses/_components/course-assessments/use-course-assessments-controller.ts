import { useMemo, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";

import { useCourseInterviewSessions } from "@/lib/api/hooks/interviews";
import { useCourseQuizAttempts } from "@/lib/api/hooks/quizzes";
import { useTeacherCourseById } from "@/lib/api/hooks/teacher-courses";
import type {
  InterviewSessionTeacherRead,
  QuizAttemptTeacherRead,
} from "@/lib/api/types";

import {
  buildActiveChips,
  collectInterviewTitles,
  collectQuizTitles,
  computeQuizPassRate,
  countDistinctStudents,
  filterInterviewSessions,
  filterQuizAttempts,
} from "./helpers";
import type { ActiveChip, Tab } from "./types";

/**
 * Every piece of state and every derived value of the course-wide Assessments
 * tab, extracted from the former 458-line course-assessments.tsx. The hook
 * sequence is unchanged — navigate, params, the three queries, the five
 * `useState` calls, then the eight `useMemo` calls in their original order with
 * their original dependency arrays.
 */
export interface CourseAssessmentsController {
  navigate: ReturnType<typeof useNavigate>;
  courseId: string;
  quizAttempts: QuizAttemptTeacherRead[] | undefined;
  quizzesLoading: boolean;
  interviewSessions: InterviewSessionTeacherRead[] | undefined;
  interviewsLoading: boolean;
  tab: Tab;
  setTab: (value: Tab) => void;
  search: string;
  setSearch: (value: string) => void;
  titleFilter: string;
  setTitleFilter: (value: string) => void;
  resultFilter: string;
  setResultFilter: (value: string) => void;
  timeFilter: string;
  setTimeFilter: (value: string) => void;
  quizTitles: string[];
  interviewTitles: string[];
  filteredQuizAttempts: QuizAttemptTeacherRead[];
  filteredInterviewSessions: InterviewSessionTeacherRead[];
  distinctStudents: number;
  activeChips: ActiveChip[];
  quizPassRate: number | null;
}

export function useCourseAssessmentsController(): CourseAssessmentsController {
  const navigate = useNavigate();
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  useTeacherCourseById(courseId);
  const { data: quizAttempts, isLoading: quizzesLoading } =
    useCourseQuizAttempts(courseId);
  const { data: interviewSessions, isLoading: interviewsLoading } =
    useCourseInterviewSessions(courseId);

  const [tab, setTab] = useState<Tab>("quizzes");
  const [search, setSearch] = useState("");
  // Dropdown filters (mirrored across both tabs): a title filter (which quiz /
  // which interview), a result filter (pass/fail/…), and a time window.
  const [titleFilter, setTitleFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");

  // Earliest timestamp allowed by the selected time window (null = no bound).
  const timeCutoff = useMemo(() => {
    if (timeFilter === "all") return null;
    const days = timeFilter === "today" ? 1 : Number(timeFilter);
    if (!Number.isFinite(days)) return null;
    return Date.now() - days * 24 * 60 * 60 * 1000;
  }, [timeFilter]);

  // Distinct quiz / interview titles for the title dropdown, sorted A→Z.
  const quizTitles = useMemo(
    () => collectQuizTitles(quizAttempts),
    [quizAttempts],
  );
  const interviewTitles = useMemo(
    () => collectInterviewTitles(interviewSessions),
    [interviewSessions],
  );

  const filteredQuizAttempts = useMemo(
    () =>
      filterQuizAttempts(quizAttempts, {
        search,
        titleFilter,
        resultFilter,
        timeCutoff,
      }),
    [quizAttempts, search, titleFilter, resultFilter, timeCutoff],
  );

  const filteredInterviewSessions = useMemo(
    () =>
      filterInterviewSessions(interviewSessions, {
        search,
        titleFilter,
        resultFilter,
        timeCutoff,
      }),
    [interviewSessions, search, titleFilter, resultFilter, timeCutoff],
  );

  const distinctStudents = useMemo(
    () => countDistinctStudents(quizAttempts, interviewSessions),
    [quizAttempts, interviewSessions],
  );

  // Active-filter chips — one removable chip per non-default filter, so the
  // teacher sees exactly what's narrowing the list and can clear each singly.
  const activeChips = useMemo(
    () =>
      buildActiveChips({
        criteria: { search, titleFilter, resultFilter, timeFilter },
        tab,
        setSearch,
        setTitleFilter,
        setResultFilter,
        setTimeFilter,
      }),
    [search, titleFilter, resultFilter, timeFilter, tab],
  );

  const quizPassRate = useMemo(
    () => computeQuizPassRate(quizAttempts),
    [quizAttempts],
  );

  return {
    navigate,
    courseId,
    quizAttempts,
    quizzesLoading,
    interviewSessions,
    interviewsLoading,
    tab,
    setTab,
    search,
    setSearch,
    titleFilter,
    setTitleFilter,
    resultFilter,
    setResultFilter,
    timeFilter,
    setTimeFilter,
    quizTitles,
    interviewTitles,
    filteredQuizAttempts,
    filteredInterviewSessions,
    distinctStudents,
    activeChips,
    quizPassRate,
  };
}
