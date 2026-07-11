import { useNavigate, useParams, useRouter } from "@tanstack/react-router";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  useInterviewTranscript,
  useTeacherGapReport,
  useTeacherInterviewSession,
} from "@/lib/api/hooks/interviews";
import type {
  GapReportAuthoringRead,
  InterviewSessionPublic,
  StudyPlanItem,
} from "@/lib/api/types";

interface CriterionEntry {
  outcome_text?: unknown;
  verdict_met?: unknown;
  evidence_excerpt?: unknown;
  rationale?: unknown;
}

function asCriterionEntry(value: unknown): CriterionEntry | null {
  return value && typeof value === "object" ? (value as CriterionEntry) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function InterviewGapReportPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();
  const { sessionId } = useParams({ strict: false }) as { sessionId: string };
  const { data: report, isLoading, isError, error } =
    useTeacherGapReport(sessionId);
  const { data: session } = useTeacherInterviewSession(sessionId);

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
      });
      return;
    }
    void navigate({ to: "/teacher/courses" });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-m3-secondary" />
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="text-center py-24 text-m3-on-surface-variant space-y-4">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <FileText className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="font-headline font-bold text-m3-on-surface">
            {t("teacher_interview_gap_report.empty_states.no_report")}
          </p>
          <p className="text-sm mt-1 max-w-md mx-auto">
            {(error as Error | undefined)?.message ||
              t(
                "teacher_interview_gap_report.errors.no_view_permission_or_ungraded",
              )}
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-[1100px] mx-auto">
      <Header report={report} session={session ?? null} onBack={goBack} />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7 space-y-4">
          <SummaryCard
            summary={report.discrepancy_summary}
            teacherSummary={report.teacher_summary}
          />

          <CriterionBreakdown
            breakdown={report.per_criterion_breakdown}
          />
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-4">
          <StudyPlanCard items={report.study_plan} />
          <SourceLinksCard report={report} />
        </div>
      </div>

      <TranscriptCard sessionId={sessionId} />
    </div>
  );
}

function TranscriptCard({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useInterviewTranscript(sessionId);
  const turns = data?.turns ?? [];

  return (
    <GlassCard className="p-6 space-y-4">
      <h3 className="font-headline font-bold text-m3-primary">
        {t("teacher_interview_gap_report.transcript.title")}
      </h3>
      {isLoading && (
        <p className="text-sm text-m3-on-surface-variant">{t("common.loading")}</p>
      )}
      {!isLoading && turns.length === 0 && (
        <p className="text-sm text-m3-on-surface-variant">
          {t("teacher_interview_gap_report.transcript.empty")}
        </p>
      )}
      {turns.length > 0 && (
        <ul className="space-y-3">
          {turns.map((turn, idx) => (
            <li
              key={idx}
              className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low p-3 space-y-1"
            >
              {turn.question_prompt && (
                <p className="text-[11px] font-semibold text-m3-outline uppercase tracking-widest">
                  {turn.question_prompt}
                </p>
              )}
              <p className="text-sm text-m3-on-surface leading-relaxed">
                <span className="font-bold mr-1.5">
                  {t(`teacher_interview_gap_report.transcript.role.${turn.role}`)}:
                </span>
                {turn.content_text ??
                  (turn.has_audio
                    ? t("teacher_interview_gap_report.transcript.audio_only")
                    : "—")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}

function Header({
  report,
  session,
  onBack,
}: {
  report: GapReportAuthoringRead;
  session: InterviewSessionPublic | null;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const configId = session?.interview_config_id;
  return (
    <div className="flex items-start gap-3">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 mt-1 shrink-0"
        title={t("common.back")}
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <div className="space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_interview_gap_report.sections.title")}
        </p>
        <h1 className="text-2xl lg:text-3xl font-extrabold font-headline tracking-tight text-gradient-primary leading-tight">
          {t("teacher_interview_gap_report.labels.session_id", {
            id: report.id.slice(0, 8),
          })}
        </h1>
        <p className="text-xs text-m3-on-surface-variant">
          {t("teacher_interview_gap_report.labels.updated_at", {
            date: formatDate(report.generated_at),
          })}
          {configId &&
            t("teacher_interview_gap_report.labels.related_interview", {
              id: configId.slice(0, 8),
            })}
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  summary,
  teacherSummary,
}: {
  summary: string | null | undefined;
  teacherSummary: string | null | undefined;
}) {
  const { t } = useTranslation();
  return (
    <GlassCard className="p-6 space-y-4">
      <div>
        <h2 className="font-headline font-bold text-base text-m3-on-surface mb-2">
          {t("teacher_interview_gap_report.sections.overview")}
        </h2>
        {summary ? (
          <p className="text-sm text-m3-on-surface-variant leading-relaxed">
            {summary}
          </p>
        ) : (
          <p className="text-sm italic text-m3-on-surface-variant">
            {t("teacher_interview_gap_report.empty_states.no_overview")}
          </p>
        )}
      </div>
      {teacherSummary && (
        <div className="rounded-xl bg-m3-surface-container-low p-4 border border-m3-outline-variant/20">
          <p className="text-[11px] uppercase font-bold tracking-widest text-m3-on-surface-variant mb-1.5">
            {t("teacher_interview_gap_report.labels.teacher_notes")}
          </p>
          <p className="text-sm text-m3-on-surface leading-relaxed whitespace-pre-wrap">
            {teacherSummary}
          </p>
        </div>
      )}
    </GlassCard>
  );
}

function CriterionBreakdown({
  breakdown,
}: {
  breakdown: GapReportAuthoringRead["per_criterion_breakdown"];
}) {
  const { t } = useTranslation();
  const entries = Object.entries(breakdown ?? {});
  return (
    <GlassCard className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-headline font-bold text-base text-m3-on-surface">
          {t("teacher_interview_gap_report.sections.by_criterion")}
        </h2>
        <span className="text-xs text-m3-on-surface-variant">
          {t("teacher_interview_gap_report.labels.criteria_count", {
            count: entries.length,
          })}
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm italic text-m3-on-surface-variant">
          {t("teacher_interview_gap_report.empty_states.no_detail")}
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map(([key, value]) => {
            const entry = asCriterionEntry(value);
            const verdict =
              entry && typeof entry.verdict_met === "boolean"
                ? entry.verdict_met
                : null;
            const text = asString(entry?.outcome_text) ?? key;
            const evidence = asString(entry?.evidence_excerpt);
            const rationale = asString(entry?.rationale);

            return (
              <li
                key={key}
                className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-m3-on-surface leading-snug flex-1">
                    {text}
                  </p>
                  {verdict !== null && (
                    <span
                      className={
                        verdict
                          ? "shrink-0 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1"
                          : "shrink-0 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1"
                      }
                    >
                      {verdict
                        ? t("teacher_interview_gap_report.labels.passed")
                        : t("teacher_interview_gap_report.labels.failed")}
                    </span>
                  )}
                </div>
                {evidence && (
                  <p className="text-xs text-m3-on-surface-variant leading-relaxed pl-1 border-l-2 border-m3-outline-variant/30">
                    <span className="font-bold not-italic mr-1">
                      {t("teacher_interview_gap_report.labels.quote")}
                    </span>
                    <span className="italic">{evidence}</span>
                  </p>
                )}
                {rationale && (
                  <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                    <span className="font-bold mr-1">
                      {t("teacher_interview_gap_report.labels.analysis")}
                    </span>
                    {rationale}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}

function StudyPlanCard({ items }: { items: StudyPlanItem[] }) {
  const { t } = useTranslation();
  return (
    <GlassCard className="p-6 space-y-3">
      <h2 className="font-headline font-bold text-base text-m3-on-surface">
        {t("teacher_interview_gap_report.sections.study_plan")}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm italic text-m3-on-surface-variant">
          {t("teacher_interview_gap_report.empty_states.no_study_plan")}
        </p>
      ) : (
        <ol className="space-y-2.5">
          {items.map((item, idx) => (
            <li
              key={`${item.topic}-${idx}`}
              className="rounded-xl bg-m3-surface-container-low p-3"
            >
              <div className="flex items-start gap-2">
                <span className="shrink-0 h-6 w-6 rounded-full bg-m3-primary text-white flex items-center justify-center text-xs font-extrabold">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-m3-on-surface">
                    {item.topic}
                  </p>
                  {item.suggested_resources.length > 0 && (
                    <p className="text-xs text-m3-on-surface-variant mt-1">
                      {item.suggested_resources.join(" • ")}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </GlassCard>
  );
}

function SourceLinksCard({ report }: { report: GapReportAuthoringRead }) {
  const { t } = useTranslation();
  const sources = [
    report.source_quiz_attempt_id && {
      label: t("teacher_interview_gap_report.labels.source_quiz_attempt"),
      value: report.source_quiz_attempt_id,
    },
    report.source_interview_session_id && {
      label: t("teacher_interview_gap_report.labels.source_interview_session"),
      value: report.source_interview_session_id,
    },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  if (sources.length === 0) return null;

  return (
    <GlassCard className="p-6 space-y-3">
      <h2 className="font-headline font-bold text-base text-m3-on-surface">
        {t("teacher_interview_gap_report.sections.sources")}
      </h2>
      <ul className="space-y-2">
        {sources.map((s) => (
          <li
            key={s.value}
            className="flex items-center justify-between gap-3 rounded-xl bg-m3-surface-container-low px-3 py-2 text-xs"
          >
            <span className="text-m3-on-surface-variant">{s.label}</span>
            <span className="font-mono font-bold text-m3-on-surface truncate">
              {s.value}
            </span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
