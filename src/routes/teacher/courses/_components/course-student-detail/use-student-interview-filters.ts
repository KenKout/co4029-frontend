import { useMemo, useState } from "react";

import type { InterviewSessionTeacherRead } from "@/lib/api/types";

import { interviewResultOf } from "./helpers";

/**
 * The Interview Attempts filters (Interview / Result / Time) of the per-student
 * detail page, extracted from the former 659-line course-student-detail.tsx.
 * Same three `useState` calls followed by the same three `useMemo` calls with
 * their original dependency arrays, so the page's hook sequence is unchanged.
 */
export interface StudentInterviewFiltersController {
  ivInterviewFilter: string;
  setIvInterviewFilter: (value: string) => void;
  ivResultFilter: string;
  setIvResultFilter: (value: string) => void;
  ivTimeFilter: string;
  setIvTimeFilter: (value: string) => void;
  ivInterviewTitles: string[];
  filteredInterviewSessions: InterviewSessionTeacherRead[];
  ivFiltersActive: boolean;
  clearIvFilters: () => void;
}

export function useStudentInterviewFilters(
  interviewSessions: InterviewSessionTeacherRead[] | undefined,
): StudentInterviewFiltersController {
  // ── Interview attempt filters (Interview / Result / Time) ──
  const [ivInterviewFilter, setIvInterviewFilter] = useState("all");
  const [ivResultFilter, setIvResultFilter] = useState("all");
  const [ivTimeFilter, setIvTimeFilter] = useState("all");

  const ivTimeCutoff = useMemo(() => {
    if (ivTimeFilter === "all") return null;
    const days = ivTimeFilter === "today" ? 1 : Number(ivTimeFilter);
    return Date.now() - days * 24 * 60 * 60 * 1000;
  }, [ivTimeFilter]);

  // Distinct interview titles this student attempted, for the Interview dropdown.
  const ivInterviewTitles = useMemo(() => {
    const set = new Set<string>();
    for (const s of interviewSessions ?? []) set.add(s.interview_config_title);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [interviewSessions]);

  const filteredInterviewSessions = useMemo(() => {
    return (interviewSessions ?? []).filter((s) => {
      if (
        ivInterviewFilter !== "all" &&
        s.interview_config_title !== ivInterviewFilter
      )
        return false;
      if (ivResultFilter !== "all") {
        const r = interviewResultOf(s);
        if (r !== ivResultFilter) return false;
      }
      if (ivTimeCutoff != null) {
        const ts = new Date(s.started_at).getTime();
        if (Number.isNaN(ts) || ts < ivTimeCutoff) return false;
      }
      return true;
    });
  }, [interviewSessions, ivInterviewFilter, ivResultFilter, ivTimeCutoff]);

  const ivFiltersActive =
    ivInterviewFilter !== "all" ||
    ivResultFilter !== "all" ||
    ivTimeFilter !== "all";

  function clearIvFilters() {
    setIvInterviewFilter("all");
    setIvResultFilter("all");
    setIvTimeFilter("all");
  }

  return {
    ivInterviewFilter,
    setIvInterviewFilter,
    ivResultFilter,
    setIvResultFilter,
    ivTimeFilter,
    setIvTimeFilter,
    ivInterviewTitles,
    filteredInterviewSessions,
    ivFiltersActive,
    clearIvFilters,
  };
}
