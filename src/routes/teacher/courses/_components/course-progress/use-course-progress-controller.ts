import { useMemo } from "react";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useAtRiskRoster, useCohortProgress } from "@/lib/api/hooks/progress";
import {
  useTeacherCourseById,
  useTeacherCourseRoster,
} from "@/lib/api/hooks/teacher-courses";
import type { AtRiskListRead } from "@/lib/api/types";

import {
  buildAtRiskMap,
  buildProgressRows,
  buildStudentNameMap,
  summarizeProgress,
} from "./helpers";
import type {
  AtRiskMap,
  ProgressRow,
  ProgressSummary,
  StudentNameMap,
} from "./types";

/**
 * The four queries and the five derived memos of the course Progress tab,
 * extracted from the former 401-line course-progress.tsx. The hook sequence is
 * unchanged — translation, params, the four queries, then `studentNames`,
 * `rows`, `sortedRows`, `summary` and `atRiskById` with their original
 * dependency arrays.
 */
export interface CourseProgressController {
  t: ReturnType<typeof useTranslation>["t"];
  courseId: string;
  rosterLoading: boolean;
  cohortLoading: boolean;
  atRisk: AtRiskListRead | undefined;
  atRiskLoading: boolean;
  studentNames: StudentNameMap;
  sortedRows: ProgressRow[];
  summary: ProgressSummary;
  atRiskById: AtRiskMap;
}

export function useCourseProgressController(): CourseProgressController {
  const { t } = useTranslation();
  const { courseId } = useParams({ strict: false }) as { courseId: string };

  useTeacherCourseById(courseId);
  const { data: roster, isLoading: rosterLoading } =
    useTeacherCourseRoster(courseId);
  const { data: cohort, isLoading: cohortLoading } =
    useCohortProgress(courseId);
  const { data: atRisk, isLoading: atRiskLoading } = useAtRiskRoster(courseId);

  const studentNames = useMemo(() => buildStudentNameMap(roster), [roster]);

  const rows = useMemo(
    () => buildProgressRows(cohort, studentNames),
    [cohort, studentNames],
  );

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => b.completion_percent - a.completion_percent),
    [rows],
  );

  const summary = useMemo(() => summarizeProgress(rows), [rows]);

  const atRiskById = useMemo(
    () => buildAtRiskMap(atRisk, t("teacher_progress.no_reason")),
    [atRisk, t],
  );

  return {
    t,
    courseId,
    rosterLoading,
    cohortLoading,
    atRisk,
    atRiskLoading,
    studentNames,
    sortedRows,
    summary,
    atRiskById,
  };
}
