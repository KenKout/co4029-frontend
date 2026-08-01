/**
 * Every read the interview-config page performs, plus the counts derived from
 * them.
 *
 * Split out of `routes/teacher/interview-config.tsx` (step 7 of that file's
 * decomposition). The queries and memos are called in the SAME order as before,
 * so React's hook slots are unchanged — this is a grouping, not a re-ordering.
 * It also keeps every optional-chaining fallback (`?? 0`, `?? []`) out of the
 * page, which is what let the page become a plain composition.
 */

import { useMemo } from "react";

import { useInterviewForAuthoring } from "@/lib/api/hooks/interviews";
import {
  useTeacherCourseById,
  useTeacherCourseContent,
} from "@/lib/api/hooks/teacher-courses";

export function useConfigPageData(courseId: string, configId: string) {
  const { data: course } = useTeacherCourseById(courseId);
  const { data: content } = useTeacherCourseContent(courseId);
  const { data: authoring, isLoading: configLoading } =
    useInterviewForAuthoring(configId);
  const config = authoring?.config;
  const questions = authoring?.questions;
  const outcomes = authoring?.outcomes;

  const courseModule = useMemo(
    () => content?.modules.find((m) => m.id === config?.module_id),
    [content, config?.module_id],
  );

  const draftCount = questions?.length ?? config?.draft_question_count ?? 0;
  const approvedCount = useMemo(
    () =>
      (questions ?? []).filter((q) => q.review_status === "approved").length,
    [questions],
  );
  // Approved questions in the practice partition. Mirrors the server's own
  // gate, so the form can warn before a student hits the 409.
  const practiceQuestionCount = useMemo(
    () =>
      (questions ?? []).filter(
        (q) => q.review_status === "approved" && q.practice_only,
      ).length,
    [questions],
  );

  return {
    configLoading,
    config,
    questions,
    outcomes,
    courseTitle: course?.title,
    modules: content?.modules,
    moduleTitle: courseModule ? courseModule.title : null,
    draftCount,
    approvedCount,
    practiceQuestionCount,
    outcomeCount: outcomes?.length ?? 0,
  };
}
