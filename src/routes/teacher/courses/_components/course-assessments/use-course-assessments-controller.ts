import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";

import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useCourseInterviewSessions } from "@/lib/api/hooks/interviews";
import {
  useCourseAssessmentSummary,
  useCourseQuizAttempts,
} from "@/lib/api/hooks/quizzes";
import { useTeacherCourseById } from "@/lib/api/hooks/teacher-courses";
import type {
  InterviewSessionTeacherRead,
  QuizAttemptTeacherRead,
} from "@/lib/api/types";

import { buildActiveChips } from "./helpers";
import type { ActiveChip, Tab } from "./types";

const PAGE_SIZE = 25;

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
  quizAttemptCount: number;
  interviewSessionCount: number;
  summaryLoading: boolean;
  searchPending: boolean;
  canGoNext: boolean;
  canGoPrev: boolean;
  goNextPage: () => void;
  goPrevPage: () => void;
  pageIndex: number;
}

export function useCourseAssessmentsController(): CourseAssessmentsController {
  const navigate = useNavigate();
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  useTeacherCourseById(courseId);

  const [tab, setTab] = useState<Tab>("quizzes");
  const [search, setSearch] = useState("");
  const [titleFilter, setTitleFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");

  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);

  const debouncedSearch = useDebouncedValue(search, 350);
  const searchPending = debouncedSearch !== search;

  // Earliest timestamp allowed by the selected time window (null = no bound).
  const sinceIso = useMemo(() => {
    if (timeFilter === "all") return undefined;
    const days = timeFilter === "today" ? 1 : Number(timeFilter);
    if (!Number.isFinite(days)) return undefined;
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  }, [timeFilter]);

  useEffect(() => {
    setCursors([undefined]);
  }, [debouncedSearch, titleFilter, resultFilter, timeFilter, tab]);

  const query = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      title: titleFilter === "all" ? undefined : titleFilter,
      result: resultFilter === "all" ? undefined : resultFilter,
      since: sinceIso,
      limit: PAGE_SIZE,
      cursor: cursors[cursors.length - 1],
    }),
    [debouncedSearch, titleFilter, resultFilter, sinceIso, cursors],
  );

  const { data: quizPage, isLoading: quizzesLoading } = useCourseQuizAttempts(
    courseId,
    query,
    { enabled: tab === "quizzes" },
  );
  const { data: interviewPage, isLoading: interviewsLoading } =
    useCourseInterviewSessions(courseId, query, {
      enabled: tab === "interviews",
    });
  const { data: summary, isLoading: summaryLoading } =
    useCourseAssessmentSummary(courseId);

  const nextCursor =
    tab === "quizzes" ? quizPage?.next_cursor : interviewPage?.next_cursor;

  const goNextPage = useCallback(() => {
    if (!nextCursor) return;
    setCursors((stack) => [...stack, nextCursor]);
  }, [nextCursor]);

  const goPrevPage = useCallback(() => {
    setCursors((stack) => (stack.length > 1 ? stack.slice(0, -1) : stack));
  }, []);

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

  const quizAttempts = quizPage?.items;
  const interviewSessions = interviewPage?.items;

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
    quizTitles: summary?.quiz_titles ?? [],
    interviewTitles: summary?.interview_titles ?? [],
    filteredQuizAttempts: quizAttempts ?? [],
    filteredInterviewSessions: interviewSessions ?? [],
    distinctStudents: summary?.students_assessed ?? 0,
    activeChips,
    quizPassRate: summary?.quiz_pass_rate ?? null,
    quizAttemptCount: summary?.quiz_attempt_count ?? 0,
    interviewSessionCount: summary?.interview_session_count ?? 0,
    summaryLoading,
    searchPending,
    canGoNext: Boolean(nextCursor),
    canGoPrev: cursors.length > 1,
    goNextPage,
    goPrevPage,
    pageIndex: cursors.length - 1,
  };
}
