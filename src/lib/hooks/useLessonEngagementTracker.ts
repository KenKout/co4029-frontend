import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useReportEngagement } from "@/lib/api/hooks/progress";

/**
 * Tracks time-on-lesson and emits MaterialEngagement events.
 *
 * Strategy:
 * - Anchor "started_at" when the (materialVersionId, lessonId) pair becomes
 *   active. Fire a heartbeat every HEARTBEAT_MS while visible/focused, with
 *   the elapsed seconds and current ended_at = now.
 * - On unmount or when materialVersionId/lessonId changes, flush a final
 *   event covering the unsent tail.
 * - Skip emissions when the page is hidden (visibility API) — accumulating
 *   time while the tab is in the background overstates engagement.
 *
 * No-op when materialVersionId is null/undefined (e.g. lesson with no PDF
 * or video that the backend has resolved to a streamable version yet).
 *
 * The backend's `update_lesson_progress` triggers on every emission and
 * recomputes status/completion_percent from the engagement aggregate, so
 * a 30s cadence keeps `lesson_progress` ~live without DB churn.
 */
const HEARTBEAT_MS = 30_000;
const MIN_REPORT_SECONDS = 5;

export function useLessonEngagementTracker(opts: {
  materialVersionId: string | null | undefined;
  lessonId: string | null | undefined;
  courseId: string | null | undefined;
  contentRef?: RefObject<HTMLElement | null>;
}) {
  const { materialVersionId, lessonId, courseId, contentRef } = opts;
  const mutation = useReportEngagement({
    lessonId: lessonId ?? undefined,
    courseId: courseId ?? undefined,
  });

  const startedAtRef = useRef<Date | null>(null);
  const lastEmitRef = useRef<Date | null>(null);
  const scrollRef = useRef<number | null>(null);
  const mutateRef = useRef(mutation.mutate);

  // keep refs hot without retriggering effect
  mutateRef.current = mutation.mutate;
  useEffect(() => {
    if (!materialVersionId) return;

    function isActive() {
      return document.visibilityState === "visible" && document.hasFocus();
    }

    function beginActivePeriod() {
      const now = new Date();
      startedAtRef.current ??= now;
      lastEmitRef.current = now;
    }

    function updateScrollProgress() {
      const element = contentRef?.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      if (rect.height <= 0) return;
      const viewed = Math.min(
        rect.height,
        Math.max(0, window.innerHeight - rect.top),
      );
      const percent = Math.min(100, Math.max(0, (viewed / rect.height) * 100));
      scrollRef.current = Math.max(scrollRef.current ?? 0, percent);
    }

    if (isActive()) beginActivePeriod();
    updateScrollProgress();

    function emit(now: Date) {
      const start = startedAtRef.current;
      const last = lastEmitRef.current;
      if (!start || !last) return;
      const elapsedSinceLast = Math.round(
        (now.getTime() - last.getTime()) / 1000,
      );
      if (elapsedSinceLast < MIN_REPORT_SECONDS) return;

      mutateRef.current({
        material_version_id: materialVersionId!,
        engagement_seconds: elapsedSinceLast,
        scroll_position_percent: scrollRef.current,
        started_at: last.toISOString(),
        ended_at: now.toISOString(),
      });
      lastEmitRef.current = now;
    }

    const interval = window.setInterval(() => {
      if (!isActive()) return;
      emit(new Date());
    }, HEARTBEAT_MS);

    function pauseTracking() {
      emit(new Date());
      lastEmitRef.current = null;
    }

    function resumeTracking() {
      if (isActive()) beginActivePeriod();
    }

    function handleVisibility() {
      if (document.visibilityState === "hidden") pauseTracking();
      else resumeTracking();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", pauseTracking);
    window.addEventListener("focus", resumeTracking);
    window.addEventListener("scroll", updateScrollProgress, { passive: true });
    window.addEventListener("resize", updateScrollProgress);

    function handleBeforeUnload() {
      emit(new Date());
    }
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", pauseTracking);
      window.removeEventListener("focus", resumeTracking);
      window.removeEventListener("scroll", updateScrollProgress);
      window.removeEventListener("resize", updateScrollProgress);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Final flush when (materialVersionId, lessonId) changes or component unmounts.
      emit(new Date());
      startedAtRef.current = null;
      lastEmitRef.current = null;
    };
  }, [contentRef, materialVersionId, lessonId]);
}
