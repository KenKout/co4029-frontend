import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  MinusCircle,
  RotateCcw,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useGapReport,
  useInterviewSession,
} from "@/lib/api/hooks/interviews";
import type { InterviewSessionPublic } from "@/lib/api/types";

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

type ResultPhase =
  | "pass"
  | "retry"
  | "evaluating"
  | "eval_failed"
  | "abandoned";

function phaseFor(s: InterviewSessionPublic): ResultPhase {
  if (s.status === "failed") return "eval_failed";
  if (s.status === "abandoned") return "abandoned";
  if (s.status === "in_progress") return "evaluating";
  if (s.pass_verdict === true) return "pass";
  if (s.pass_verdict === false) return "retry";
  return "evaluating";
}

function formatElapsedLabel(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export default function MyInterviewResultPage() {
  const { t, i18n } = useTranslation();
  const { sessionId } = useParams({ strict: false }) as {
    sessionId: string;
  };
  const session = useInterviewSession(sessionId);
  const { data: gapReport, isPending: gapReportPending } =
    useGapReport(sessionId);

  const locale = i18n.language?.startsWith("vi") ? "vi-VN" : "en-US";

  if (session.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (session.isError || !session.data) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <GlassCard className="p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-danger" />
          <h2 className="font-headline text-lg font-bold text-m3-on-surface">
            {t("me_interview_result.load_failed_title")}
          </h2>
          <p className="mt-1 text-sm text-m3-on-surface-variant">
            {t("me_interview_result.load_failed_body")}
          </p>
          <Link to="/me/interviews" className="mt-4 inline-block">
            <Button variant="outline" className="rounded-xl">
              <ArrowLeft className="h-4 w-4" />
              {t("me_interview_result.back_to_list")}
            </Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  const data = session.data;
  const phase = phaseFor(data);

  const finishedAtMs = data.ended_at ? new Date(data.ended_at).getTime() : null;
  const startedAtMs = data.assessment_started_at
    ? new Date(data.assessment_started_at).getTime()
    : null;
  const elapsedSeconds =
    finishedAtMs !== null && startedAtMs !== null
      ? Math.max(0, Math.floor((finishedAtMs - startedAtMs) / 1000))
      : null;
  const resultDate = data.ended_at
    ? new Date(data.ended_at).toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const cooldownActive =
    data.retake_available_at != null &&
    new Date(data.retake_available_at).getTime() > Date.now();
  const cooldownLabel = data.retake_available_at
    ? new Date(data.retake_available_at).toLocaleString(locale, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const heroToneClass =
    phase === "pass"
      ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
      : phase === "eval_failed"
        ? "bg-gradient-to-br from-danger to-red-600 text-white"
        : phase === "abandoned"
          ? "bg-m3-surface-container text-m3-on-surface-variant"
          : phase === "evaluating"
            ? "bg-gradient-to-br from-m3-surface-container to-m3-surface-container-high text-m3-primary"
            : "bg-gradient-to-br from-m3-primary to-m3-secondary text-white";

  const HeroIcon =
    phase === "pass"
      ? CheckCircle2
      : phase === "eval_failed"
        ? AlertTriangle
        : phase === "evaluating"
          ? Loader2
          : phase === "abandoned"
            ? MinusCircle
            : RotateCcw;

  const heroTitleKey =
    phase === "eval_failed"
      ? "course_interview.results.evaluation_failed"
      : phase === "abandoned"
        ? "course_interview.results.abandoned"
        : phase === "evaluating"
          ? "course_interview.results.evaluating"
          : phase === "pass"
            ? "course_interview.results.passed"
            : "course_interview.results.completed";

  const heroSummaryKey =
    phase === "eval_failed"
      ? "course_interview.results.evaluation_failed_summary"
      : phase === "abandoned"
        ? "course_interview.results.abandoned_summary"
        : phase === "evaluating"
          ? "course_interview.results.evaluating_summary"
          : phase === "pass"
            ? "course_interview.results.pass_summary"
            : "course_interview.results.fail_summary";

  const studyPlan = gapReport?.study_plan ?? [];
  const title = data.interview_title ?? t("me_interviews.untitled");

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-16 sm:p-6">
      <Link
        to="/me/interviews"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-m3-on-surface-variant transition-colors hover:text-m3-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("me_interview_result.back_to_list")}
      </Link>

      {/* ── Verdict hero (mirrors the live results screen) ── */}
      <GlassCard className="p-8 text-center motion-safe:animate-fade-in-up sm:p-10">
        <div className="mb-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-m3-secondary">
          <Bot className="h-3.5 w-3.5" />
          <span>{t("course_interview.labels.ai_interview")}</span>
          <span className="text-m3-outline">·</span>
          <span className="max-w-[220px] truncate font-semibold normal-case text-m3-on-surface-variant">
            {title}
          </span>
        </div>

        <div
          className={cn(
            "mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full shadow-lg",
            heroToneClass,
          )}
        >
          <HeroIcon
            className={cn("h-9 w-9", phase === "evaluating" && "animate-spin")}
            aria-hidden="true"
          />
        </div>
        <h1 className="mb-1.5 font-headline text-2xl font-extrabold text-m3-primary">
          {t(heroTitleKey)}
        </h1>
        <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-m3-on-surface-variant">
          {t(heroSummaryKey)}
        </p>

        {/* ── Session facts ── */}
        <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-xs">
          {elapsedSeconds !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-surface-container px-3 py-1.5 font-semibold text-m3-on-surface-variant">
              <Clock className="h-3.5 w-3.5" />
              {formatElapsedLabel(elapsedSeconds)}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-surface-container px-3 py-1.5 font-semibold text-m3-on-surface-variant">
            <History className="h-3.5 w-3.5" />
            {t("course_interview.attempts.attempt_n", {
              n: data.attempt_number,
            })}
          </span>
          {resultDate && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-surface-container px-3 py-1.5 font-semibold text-m3-on-surface-variant">
              {resultDate}
            </span>
          )}
        </div>

        {/* Retry is intentionally NOT offered here — this is a read-only
            historical view. To retry, the student returns to the interview
            lobby (which owns the live retake-policy gating). */}
        {phase === "retry" && cooldownActive && cooldownLabel && (
          <p className="mt-3 text-xs font-medium text-m3-on-surface-variant">
            {t("course_interview.results.next.cooldown", {
              when: cooldownLabel,
            })}
          </p>
        )}
      </GlassCard>

      {/* ── Study plan / gap report ── */}
      {gapReport ? (
        <GlassCard className="p-6 motion-safe:animate-fade-in-up">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-m3-primary-fixed text-m3-primary">
              <BookOpen className="h-4 w-4" />
            </span>
            <h2 className="font-headline font-bold text-m3-primary">
              {phase === "pass"
                ? t("course_interview.sections.keep_growing")
                : t("course_interview.sections.your_path_forward")}
            </h2>
          </div>
          {gapReport.discrepancy_summary && (
            <p className="mb-4 text-sm leading-relaxed text-m3-on-surface-variant">
              {gapReport.discrepancy_summary}
            </p>
          )}
          {studyPlan.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-m3-outline">
                {t("course_interview.sections.study_plan")}
              </h3>
              <ul className="space-y-2">
                {studyPlan.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl bg-m3-surface-container-low p-3 text-sm"
                  >
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-m3-primary shadow-sm">
                      <BookOpen className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold text-m3-on-surface">
                        {item.topic}
                      </span>
                      {item.suggested_resources.length > 0 && (
                        <span className="mt-1.5 flex flex-wrap gap-1.5">
                          {item.suggested_resources.map((res, ri) => (
                            <span
                              key={ri}
                              className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-m3-on-surface-variant"
                            >
                              {res}
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </GlassCard>
      ) : gapReportPending &&
        phase !== "eval_failed" &&
        phase !== "abandoned" ? (
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-m3-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("course_interview.sections.gap_report_pending")}
          </div>
          <div className="mt-4 space-y-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-14 rounded-xl bg-m3-surface-container-low motion-safe:animate-pulse"
              />
            ))}
          </div>
        </GlassCard>
      ) : null}
    </div>
  );
}
