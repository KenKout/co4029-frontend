import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useCourseBySlug } from "@/lib/api/hooks/courses";
import {
  useInterviewForTaking,
  useMyInterviewSessions,
  useStartInterviewSession,
} from "@/lib/api/hooks/interviews";

export function useInterviewRouteDataWithRef(slug: string, configRef: string) {
  const { t, i18n } = useTranslation();
  const configId = configRef;

  const { data: course, isLoading: courseLoading, error: courseError, refetch: refetchCourse } = useCourseBySlug(slug);
  const { data: takingPayload, isLoading: configLoading, error: configError, refetch: refetchConfig } = useInterviewForTaking(configId);
  const config = takingPayload?.config;

  const startSession = useStartInterviewSession(configId);
  const { data: previousSessions, isLoading: previousSessionsLoading } = useMyInterviewSessions(configId);
  // Same audit-P1 error branch as use-interview-route-data.ts: 404s are the
  // legitimate missing screen, everything else is a recoverable transport
  // error with a retry.
  const hasStatus = (error: unknown, status: number): boolean =>
    typeof error === "object" &&
    error !== null &&
    (error as { status?: unknown }).status === status;
  const transportError = [courseError, configError].find(
    (error) => Boolean(error) && !hasStatus(error, 404),
  );
  const refetchRouteData = useCallback(() => {
    void refetchCourse();
    void refetchConfig();
  }, [refetchCourse, refetchConfig]);
  // Consent state mirrors use-interview-route-data.ts so the with-ref variant
  // (curriculum route) satisfies the shared InterviewBase contract.
  const [recordingConsentAccepted, setRecordingConsentAccepted] = useState(false);
  const resumableSession = useMemo(
    () =>
      previousSessions?.find((session) => {
        if (session.status !== "in_progress") return false;
        if (session.assessment_started_at && session.time_remaining_seconds === 0) return false;
        if (session.resume_deadline_at && new Date(session.resume_deadline_at).getTime() <= Date.now()) return false;
        return true;
      }) ?? null,
    [previousSessions],
  );

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
    courseLoading,
    takingPayload,
    configLoading,
    config,
    transportError,
    refetchRouteData,
    startSession,
    previousSessionsLoading,
    resumableSession,
    pastAttempts,
    lastAttempt,
    recordingConsentAccepted,
    setRecordingConsentAccepted,
  };
}
