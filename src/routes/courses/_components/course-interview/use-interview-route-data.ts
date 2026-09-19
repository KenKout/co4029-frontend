import { useCallback, useMemo, useState } from "react";
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
  const [recordingConsentAccepted, setRecordingConsentAccepted] = useState(false);

  const courseQuery = useCourseBySlug(slug);
  const configQuery = useInterviewForTaking(configId);
  const course = courseQuery.data;
  const takingPayload = configQuery.data;
  const rawConfig = takingPayload?.config;

  // Audit P1 (URL cross-course): the config id rides the URL verbatim, so a
  // hand-edited link can pair Course A's slug with Course B's published
  // config — starting B's assessment under A's context and invalidating A's
  // progress cache on finish. A config that belongs to another course is
  // treated exactly like a missing one: never surfaced, never startable.
  const courseMismatch = Boolean(
    course && rawConfig && rawConfig.course_id !== course.id,
  );

  // Audit P1 (transport vs missing): the route queries carry their error
  // branch so the screen switch can show a recoverable error screen with
  // retry instead of claiming "no interview found" on an offline/503 blip.
  // 404s are NOT errors — a missing config is the legitimate missing screen.
  const hasStatus = (error: unknown, status: number): boolean =>
    typeof error === "object" &&
    error !== null &&
    (error as { status?: unknown }).status === status;
  const transportError = [courseQuery.error, configQuery.error].find(
    (error) => Boolean(error) && !hasStatus(error, 404),
  );

  const config = courseMismatch ? undefined : rawConfig;

  const startSession = useStartInterviewSession(configId);
  // Server-scoped to THIS config: the unscoped list is capped at 20 rows
  // across every config, so a student with a fuller history could lose the
  // in-progress session this page is trying to resume.
  const { data: previousSessions, isLoading: previousSessionsLoading } =
    useMyInterviewSessions(configId);
  const resumableSession = useMemo(
    () =>
      previousSessions?.find((session) => {
        if (session.status !== "in_progress") {
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

  // Completed (graded/terminal) past attempts, newest first — powers the
  // lobby's attempt-history block. The learner session contract exposes
  // pass_verdict + ended_at (no score %), so we show verdict + date.
  const pastAttempts = useMemo(
    () =>
      (previousSessions ?? [])
        .filter((s) => s.status === "completed" || s.status === "timed_out")
        .sort((a, b) => {
          const at = new Date(a.ended_at ?? a.started_at).getTime();
          const bt = new Date(b.ended_at ?? b.started_at).getTime();
          return bt - at;
        }),
    [previousSessions],
  );
  const lastAttempt = pastAttempts[0] ?? null;

  return {
    t,
    i18n,
    slug,
    configId,
    course,
    courseLoading: courseQuery.isLoading,
    takingPayload,
    configLoading: configQuery.isLoading,
    config,
    transportError,
    refetchRouteData: useCallback(() => {
      void courseQuery.refetch();
      void configQuery.refetch();
    }, [courseQuery, configQuery]),
    startSession,
    previousSessionsLoading,
    resumableSession,
    pastAttempts,
    lastAttempt,
    recordingConsentAccepted,
    setRecordingConsentAccepted,
  };
}
