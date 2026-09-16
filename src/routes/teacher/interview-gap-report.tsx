import { useNavigate, useParams, useRouter } from "@tanstack/react-router";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  classifyMissingGapReport,
  gapReportEmptyStateI18nKey,
  gapReportReasonI18nKey,
  shouldRequestGapReport,
  type GapReportUnavailableReason,
} from "@/lib/interview/gap-report-availability";
import {
  useTeacherGapReport,
  useTeacherInterviewSession,
} from "@/lib/api/hooks/interviews";

import { ContextCard } from "./_components/interview-gap-report/ContextCard";
import { CriterionBreakdown } from "./_components/interview-gap-report/CriterionBreakdown";
import { GapTabBar } from "./_components/interview-gap-report/GapTabBar";
import { Header } from "./_components/interview-gap-report/Header";
import { IntegrityCard } from "./_components/interview-gap-report/IntegrityCard";
import { NotesCard } from "./_components/interview-gap-report/NotesCard";
import { PersonaAdherenceCard } from "./_components/interview-gap-report/PersonaAdherenceCard";
import { TranscriptCard } from "./_components/interview-gap-report/TranscriptCard";
import type { GapReportAuthoringRead, InterviewSessionPublic } from "@/lib/api/types";
import type { GapTabId } from "./_components/interview-gap-report/types";

// Re-exported at its original path: the integrity sub-tab test imports it from
// this module, and the panel now lives in the extracted component folder.
export { IntegrityCard } from "./_components/interview-gap-report/IntegrityCard";

/** The loading / unavailable / still-grading screens, decided in ONE place.
 *
 * Spinner ONLY while something legitimately in flight is loading: the session
 * itself (unknown availability yet) or a report request the gate allowed — a
 * dead-end session never spinner-screens, its empty state renders instead.
 * `undefined` = the workspace should render.
 */
function useReportPendingScreen(
  session: InterviewSessionPublic | null | undefined,
  reportAvailable: boolean,
  reportLoading: boolean,
  report: GapReportAuthoringRead | null | undefined,
  isError: boolean,
  error: unknown,
  goBack: () => void,
): ReactNode {
  const { t } = useTranslation();
  if (!session || (reportAvailable && reportLoading && !report)) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-m3-secondary" />
      </div>
    );
  }
  if (isError || (!report && !reportAvailable)) {
    const apiStatus =
      error && typeof error === "object" && "status" in error
        ? (error as { status?: number }).status
        : undefined;
    return (
      <GapUnavailableState
        reason={classifyMissingGapReport(apiStatus, session)}
        onBack={goBack}
      />
    );
  }
  if (!report) {
    // Report still allowed but not here yet (pending grading): waiting state,
    // not a spinner — the poll keeps refreshing until the report appears.
    return (
      <div className="text-center py-24 text-m3-on-surface-variant space-y-4">
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-m3-secondary" />
        </div>
        <p className="text-sm max-w-md mx-auto">
          {t("teacher_interview_gap_report.errors.pending_grading")}
        </p>
        <Button variant="outline" className="gap-2" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Button>
      </div>
    );
  }
  return null;
}

/**
 * The dead-end / error panel. Extracted from the page fn to keep it under the
 * complexity cap; the reason decides BOTH the heading and the explanation so
 * the page and this panel can never disagree about why a report is missing.
 *
 * Never renders `ApiError.message` here: it is `API ${status}: ${body}`, so a
 * routine "not graded yet" 404 leaked the raw
 * {"detail":{"error":"not_found","resource":"gap_report","id":...}} payload.
 * The teacher-facing distinction is not the HTTP code but whether the report
 * is still coming: grading is async, so a `completed` session 404s for a
 * while and then works — but an `abandoned` session is never enqueued for
 * evaluation at all, so "check back shortly" would send that teacher to wait
 * for something that will never arrive.
 */
function GapUnavailableState({
  reason,
  onBack,
}: {
  reason: GapReportUnavailableReason;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const headingKey = gapReportEmptyStateI18nKey(reason);
  return (
    <div className="text-center py-24 text-m3-on-surface-variant space-y-4">
      <div className="flex justify-center">
        <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
          <FileText className="h-6 w-6" />
        </div>
      </div>
      <div>
        <p className="font-headline font-bold text-m3-on-surface">
          {headingKey
            ? t(headingKey)
            : t("teacher_interview_gap_report.empty_states.no_report")}
        </p>
        <p className="text-sm mt-1 max-w-md mx-auto">
          {t(gapReportReasonI18nKey(reason))}
        </p>
      </div>
      <Button variant="outline" className="gap-2" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </Button>
    </div>
  );
}

export default function InterviewGapReportPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();
  const params: { sessionId?: string } = useParams({ strict: false });
  const sessionId = params.sessionId ?? "";
  // The SESSION is fetched first and decides everything: whether the report
  // request may fire at all, and whether a spinner or an empty state renders.
  // The report query used to run unconditionally — an abandoned attempt
  // (never enqueued for evaluation) 404'd, retried 60 times over 3 minutes,
  // and the `isLoading`-first branch kept a spinner on screen the whole time.
  const { data: session } = useTeacherInterviewSession(sessionId);
  const reportAvailable = shouldRequestGapReport(session);
  const {
    data: report,
    isLoading: reportLoading,
    isError,
    error,
  } = useTeacherGapReport(sessionId, { session });

  // Tabbed workspace (Overview → Analysis → Transcript → Sources), mirroring
  // the interview-config page. Panels stay mounted (hidden via `hidden`) so
  // in-progress note edits survive tab switches.
  const [activeTab, setActiveTab] = useState<GapTabId>("overview");

  const configId = session?.interview_config_id;
  const courseId = report?.course_id;

  // Prefer real browser back (so a teacher who navigated here from the
  // interview-config page lands back on it, scroll position and all).
  // Direct deep-links / refreshes have no useful history entry, so fall
  // back to the interview-config page itself when we know its ids, and
  // only drop all the way to the course list when we don't.
  function goBack() {
    if (window.history.length > 1) {
      router.history.back();
      return;
    }
    if (courseId && configId) {
      void navigate({
        to: "/teacher/courses/$courseId/interview-configs/$configId",
        params: { courseId, configId },
        search: { tab: undefined },
      });
      return;
    }
    void navigate({ to: "/teacher/courses" });
  }

  const pendingScreen = useReportPendingScreen(
    session,
    reportAvailable,
    reportLoading,
    report,
    isError,
    error,
    goBack,
  );
  if (pendingScreen) return pendingScreen;
  if (!report || !session) {
    // Unreachable — `useReportPendingScreen` returns a screen for every
    // report-less case. Narrowing only; keeps the workspace types honest.
    return null;
  }

  return (
    <div className="space-y-6 pb-12 max-w-[1100px] mx-auto">
      <Header report={report} session={session} onBack={goBack} />

      <GapTabBar
        activeTab={activeTab}
        onSelect={setActiveTab}
        ariaLabel={t("teacher_interview_gap_report.sections.title")}
      />

      {/* Overview — session context + notes/study plan. */}
      <div
        id="overview"
        role="tabpanel"
        aria-labelledby="tab-overview"
        hidden={activeTab !== "overview"}
        className="space-y-6"
      >
        <ContextCard report={report} session={session} />
        <NotesCard
          sessionId={sessionId}
          teacherSummary={report.teacher_summary}
          studyPlan={report.study_plan}
          courseId={report.course_id}
        />
      </div>

      {/* Analysis — criterion charts + per-criterion breakdown. */}
      <div
        id="analysis"
        role="tabpanel"
        aria-labelledby="tab-analysis"
        hidden={activeTab !== "analysis"}
      >
        <CriterionBreakdown report={report} />
        <PersonaAdherenceCard report={report} />
      </div>

      {/* Transcript — full interview turn-by-turn. */}
      <div
        id="transcript"
        role="tabpanel"
        aria-labelledby="tab-transcript"
        hidden={activeTab !== "transcript"}
      >
        <TranscriptCard
          sessionId={sessionId}
          studentName={report.student_name ?? null}
        />
      </div>

      {/* Integrity — FR-5.8 proctoring signal timeline. */}
      <div
        id="integrity"
        role="tabpanel"
        aria-labelledby="tab-integrity"
        hidden={activeTab !== "integrity"}
      >
        <IntegrityCard sessionId={sessionId} />
      </div>
    </div>
  );
}
