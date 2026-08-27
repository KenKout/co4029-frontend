import { Link, useParams, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { useGapReport, useInterviewSession } from "@/lib/api/hooks/interviews";
import {
  GapReportCard,
  GapReportPendingCard,
} from "./_components/interview-result/GapReportCards";
import {
  ResultLoadFailed,
  ResultLoadingSkeleton,
} from "./_components/interview-result/ResultStates";
import VerdictHero from "./_components/interview-result/VerdictHero";
import {
  deriveSessionFacts,
  phaseFor,
  resolveLocale,
} from "./_components/interview-result/helpers";

/**
 * Read-only student view of a *past* interview result.
 *
 * The lobby + `/me/interviews` list previously dead-ended: rows showed a
 * verdict but weren't openable, so a student could never revisit a result or
 * its study plan. This route makes that history navigable. It is deliberately
 * a SEPARATE, self-contained page rather than an extraction of the live
 * taking-route's inline results block (that block is ~330 lines tightly
 * coupled to live session state); here we re-derive the same presentation
 * from the two student-owner-accessible read endpoints:
 *   - GET /interview-sessions/{id}        (verdict, status, dates, attempt #)
 *   - GET /interview-sessions/{id}/gap-report  (discrepancy + study plan)
 *
 * Thesis §4.3: students see the binary verdict + qualitative remediation only
 * — never a numeric score / rubric — so this view exposes none.
 */
export default function MyInterviewResultPage() {
  const { t, i18n } = useTranslation();
  const { sessionId } = useParams({ strict: false }) as {
    sessionId: string;
  };
  // Deep-link origin: when the student opened this result from the interview
  // lobby (attempt history), the lobby passes the course slug + module id so
  // "Back" returns to that lobby instead of the generic /me/interviews list.
  const search = useSearch({ strict: false }) as {
    from?: string;
    course?: string;
    module?: string;
  };
  const backToInterview =
    search.from === "course" && search.course && search.module
      ? { slug: search.course, module: search.module }
      : null;
  const session = useInterviewSession(sessionId);
  const { data: gapReport, isPending: gapReportPending } =
    useGapReport(sessionId);

  const locale = resolveLocale(i18n.language);

  if (session.isLoading) {
    return <ResultLoadingSkeleton />;
  }

  if (session.isError || !session.data) {
    return <ResultLoadFailed />;
  }

  const data = session.data;
  const phase = phaseFor(data);
  const facts = deriveSessionFacts(data, locale);
  const title = data.interview_title ?? t("me_interviews.untitled");

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-16 sm:p-6">
      {backToInterview ? (
        <Link
          to="/courses/$slug/learn/$itemSlug"
          params={{
            slug: backToInterview.slug,
            itemSlug: backToInterview.module,
          }}
          search={{ start: false }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-m3-on-surface-variant transition-colors hover:text-m3-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("me_interview_result.back_to_interview")}
        </Link>
      ) : (
        <Link
          to="/me/interviews"
          search={{ config: undefined }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-m3-on-surface-variant transition-colors hover:text-m3-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("me_interview_result.back_to_list")}
        </Link>
      )}

      <VerdictHero
        hero={{
          ...facts,
          phase,
          title,
          attemptNumber: data.attempt_number,
        }}
      />

      {gapReport ? (
        <GapReportCard gapReport={gapReport} phase={phase} />
      ) : gapReportPending &&
        phase !== "eval_failed" &&
        phase !== "abandoned" ? (
        <GapReportPendingCard />
      ) : null}
    </div>
  );
}
