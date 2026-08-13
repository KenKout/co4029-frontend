import { useMemo } from "react";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useCourseBySlug } from "@/lib/api/hooks/courses";
import {
  useInterviewForTaking,
  useMyInterviewSessions,
  useStartInterviewSession,
} from "@/lib/api/hooks/interviews";

/**
 * Route params plus the read-only queries the lobby and every later screen
 * depend on. Extracted verbatim from the former 2.3k-line course-interview.tsx;
 * this is the FIRST hook group in the page's hook order (see
 * use-course-interview.ts) and must stay first.
 */
export function useInterviewRouteData() {
  const { t, i18n } = useTranslation();
  // Route: /courses/$slug/interview/$moduleId
  // $moduleId carries the interview_config_id (set by course-learn link)
  const { slug, moduleId } = useParams({ strict: false }) as {
    slug: string;
    moduleId: string;
  };
  const configId = moduleId;

  const { data: course, isLoading: courseLoading } = useCourseBySlug(slug);
  const { data: takingPayload, isLoading: configLoading } =
    useInterviewForTaking(configId);
  const config = takingPayload?.config;

  const startSession = useStartInterviewSession(configId);
  const { data: previousSessions, isLoading: previousSessionsLoading } =
    useMyInterviewSessions();
  const resumableSession = useMemo(
    () =>
      previousSessions?.find((session) => {
        if (
          session.interview_config_id !== configId ||
          session.status !== "in_progress"
        ) {
          return false;
        }
        if (
          session.assessment_started_at &&
          session.time_remaining_seconds === 0
        ) {
          return false;
        }
        if (
          session.resume_deadline_at &&
          new Date(session.resume_deadline_at).getTime() <= Date.now()
        ) {
          return false;
        }
        return true;
      }) ?? null,
    [configId, previousSessions],
  );

  // Completed (graded/terminal) past attempts for THIS config, newest first —
  // powers the lobby's attempt-history block. The learner session contract
  // exposes pass_verdict + ended_at (no score %), so we show verdict + date.
  const pastAttempts = useMemo(
    () =>
      (previousSessions ?? [])
        .filter(
          (s) =>
            s.interview_config_id === configId &&
            (s.status === "completed" || s.status === "timed_out"),
        )
        .sort((a, b) => {
          const at = new Date(a.ended_at ?? a.started_at).getTime();
          const bt = new Date(b.ended_at ?? b.started_at).getTime();
          return bt - at;
        }),
    [configId, previousSessions],
  );
  const lastAttempt = pastAttempts[0] ?? null;

  return {
    t,
    i18n,
    slug,
    configId,
    course,
    courseLoading,
    takingPayload,
    configLoading,
    config,
    startSession,
    previousSessionsLoading,
    resumableSession,
    pastAttempts,
    lastAttempt,
  };
}
