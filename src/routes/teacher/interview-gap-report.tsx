import { Link, useNavigate, useParams, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, FileText, Loader2, Pencil, Save, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import {
  useInterviewTranscript,
  useSaveGapReportNotes,
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

const TRANSCRIPT_PAGE_SIZE = 8;

// Format seconds elapsed since the interview's first turn as m:ss (or h:mm:ss),
// mirroring the live interview session's relative timestamp (starts at 0:00).
function formatRelativeTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Bare UUID matcher: study-plan "suggested_resources" sometimes carries raw
// resource UUIDs that have no human label yet. Rendering those verbatim looks
// like broken data, so we hide them rather than show a wall of hex.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function humanResources(resources: string[]): string[] {
  return resources.filter((r) => !UUID_RE.test(r.trim()));
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

      <ContextCard report={report} session={session ?? null} />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7 space-y-4">
          <NotesCard
            sessionId={sessionId}
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
  const [page, setPage] = useState(0);

  // Baseline for relative timestamps: the first turn is 0:00, every later turn
  // is its offset from that first turn (matches the live interview session).
  const baseline = turns.length > 0 ? new Date(turns[0].created_at).getTime() : 0;

  const total = turns.length;
  const pageCount = Math.max(1, Math.ceil(total / TRANSCRIPT_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * TRANSCRIPT_PAGE_SIZE;
  const pageTurns = turns.slice(start, start + TRANSCRIPT_PAGE_SIZE);

  return (
    <GlassCard className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="font-headline font-bold text-m3-primary">
          {t("teacher_interview_gap_report.transcript.title")}
        </h3>
        {total > TRANSCRIPT_PAGE_SIZE && (
          <span className="text-xs text-m3-on-surface-variant tabular-nums">
            {t("teacher_interview_gap_report.transcript.page_status", {
              start: start + 1,
              end: Math.min(start + TRANSCRIPT_PAGE_SIZE, total),
              total,
            })}
          </span>
        )}
      </div>
      {isLoading && (
        <p className="text-sm text-m3-on-surface-variant">{t("common.loading")}</p>
      )}
      {!isLoading && turns.length === 0 && (
        <p className="text-sm text-m3-on-surface-variant">
          {t("teacher_interview_gap_report.transcript.empty")}
        </p>
      )}
      {turns.length > 0 && (
        <>
          <ul className="space-y-3">
            {pageTurns.map((turn, idx) => (
              <li
                key={start + idx}
                className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low p-3 space-y-1"
              >
                <div className="flex items-start justify-between gap-3">
                  {turn.question_prompt ? (
                    <p className="text-[11px] font-semibold text-m3-outline uppercase tracking-widest">
                      {turn.question_prompt}
                    </p>
                  ) : (
                    <span />
                  )}
                  {/* Relative timestamp (0:00 = first turn), pushed to the far right. */}
                  <time className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-m3-primary">
                    {formatRelativeTime(
                      (new Date(turn.created_at).getTime() - baseline) / 1000,
                    )}
                  </time>
                </div>
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
          {pageCount > 1 && (
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                {t("teacher_interview_gap_report.transcript.prev")}
              </Button>
              <span className="text-xs text-m3-on-surface-variant tabular-nums px-1">
                {safePage + 1} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                {t("teacher_interview_gap_report.transcript.next")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
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
  // Prefer a human title (interview name) over the raw session UUID. Fall back
  // to the short session id only when no title is available.
  const title =
    report.interview_title ||
    session?.interview_title ||
    t("teacher_interview_gap_report.labels.session_id", {
      id: report.id.slice(0, 8),
    });
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
          {title}
        </h1>
        <p className="text-xs text-m3-on-surface-variant">
          {t("teacher_interview_gap_report.labels.updated_at", {
            date: formatDate(report.generated_at),
          })}
        </p>
      </div>
    </div>
  );
}

function ContextRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase font-bold tracking-widest text-m3-on-surface-variant/70">
        {label}
      </p>
      <p className="text-sm font-semibold text-m3-on-surface truncate">{value}</p>
    </div>
  );
}

function ContextCard({
  report,
  session,
}: {
  report: GapReportAuthoringRead;
  session: InterviewSessionPublic | null;
}) {
  const { t } = useTranslation();

  const startedAt = session?.started_at ?? null;
  const endedAt = session?.ended_at ?? null;
  const durationMin =
    startedAt && endedAt
      ? Math.max(
          0,
          Math.round(
            (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000,
          ),
        )
      : null;

  const status = session?.status ?? null;
  const verdict = session?.pass_verdict ?? null;

  return (
    <GlassCard className="p-6 space-y-4">
      <h2 className="font-headline font-bold text-base text-m3-primary mb-2">
        {t("teacher_interview_gap_report.sections.context")}
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
        {report.student_name && (
          <ContextRow
            label={t("teacher_interview_gap_report.labels.student")}
            value={
              report.course_id && report.student_id ? (
                <Link
                  to="/teacher/courses/$courseId/students/$studentId"
                  params={{
                    courseId: report.course_id,
                    studentId: report.student_id,
                  }}
                  className="text-m3-primary underline decoration-m3-primary/30 underline-offset-2 transition-colors hover:decoration-m3-primary hover:text-m3-primary/80"
                >
                  {report.student_name}
                </Link>
              ) : (
                report.student_name
              )
            }
          />
        )}
        {(report.interview_title || session?.interview_title) && (
          <ContextRow
            label={t("teacher_interview_gap_report.labels.interview")}
            value={report.interview_title || session?.interview_title}
          />
        )}
        {session?.attempt_number != null && (
          <ContextRow
            label={t("teacher_interview_gap_report.labels.attempt")}
            value={t("teacher_interview_gap_report.labels.attempt_value", {
              n: session.attempt_number,
            })}
          />
        )}
        <ContextRow
          label={t("teacher_interview_gap_report.labels.started_at")}
          value={startedAt ? formatDate(startedAt) : "—"}
        />
        <ContextRow
          label={t("teacher_interview_gap_report.labels.ended_at")}
          value={
            endedAt
              ? formatDate(endedAt)
              : t("teacher_interview_gap_report.labels.in_progress")
          }
        />
        {durationMin != null && (
          <ContextRow
            label={t("teacher_interview_gap_report.labels.duration")}
            value={t("teacher_interview_gap_report.labels.duration_value", {
              minutes: durationMin,
            })}
          />
        )}
        {session?.input_mode && (
          <ContextRow
            label={t("teacher_interview_gap_report.labels.mode")}
            value={session.input_mode}
          />
        )}
        {status && (
          <ContextRow
            label={t("teacher_interview_gap_report.labels.status")}
            value={status}
          />
        )}
        {verdict !== null && (
          <ContextRow
            label={t("teacher_interview_gap_report.labels.verdict")}
            value={
              <span
                className={
                  verdict
                    ? "inline-flex rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5"
                    : "inline-flex rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5"
                }
              >
                {verdict
                  ? t("teacher_interview_gap_report.labels.passed")
                  : t("teacher_interview_gap_report.labels.failed")}
              </span>
            }
          />
        )}
      </div>

      {/* Gap overview merged into the context section. */}
      <div className="border-t border-m3-outline-variant/20 pt-4">
        <p className="text-[11px] uppercase font-bold tracking-widest text-m3-on-surface-variant mb-1.5">
          {t("teacher_interview_gap_report.sections.overview")}
        </p>
        {report.discrepancy_summary ? (
          <p className="text-sm text-m3-on-surface-variant leading-relaxed">
            {report.discrepancy_summary}
          </p>
        ) : (
          <p className="text-sm italic text-m3-on-surface-variant">
            {t("teacher_interview_gap_report.empty_states.no_overview")}
          </p>
        )}
      </div>
    </GlassCard>
  );
}

function NotesCard({
  sessionId,
  teacherSummary,
}: {
  sessionId: string;
  teacherSummary: string | null | undefined;
}) {
  const { t } = useTranslation();
  const saveNotes = useSaveGapReportNotes(sessionId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(teacherSummary ?? "");

  function startEditing() {
    setDraft(teacherSummary ?? "");
    setEditing(true);
  }

  async function handleSave() {
    try {
      await saveNotes.mutateAsync(draft.trim() || null);
      toast.success(t("teacher_interview_gap_report.labels.saved"));
      setEditing(false);
    } catch (err) {
      toast.error(
        (err as Error).message ||
          t("teacher_interview_gap_report.labels.save_failed"),
      );
    }
  }

  return (
    <GlassCard className="p-6">
      <div className="rounded-xl bg-m3-surface-container-low p-4 border border-m3-outline-variant/20 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase font-bold tracking-widest text-m3-on-surface-variant">
            {t("teacher_interview_gap_report.labels.notes")}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 gap-1 text-xs transition-all duration-200 hover:bg-m3-primary/10 hover:scale-105 active:scale-95 ${
              editing ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
            onClick={startEditing}
          >
            <Pencil className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-12" />
            {t("teacher_interview_gap_report.labels.edit")}
          </Button>
        </div>

        {/* Animated expand/collapse for the editor. */}
        <div
          className={`grid transition-all duration-300 ease-out ${
            editing ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="space-y-2.5">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                maxLength={5000}
                placeholder={t(
                  "teacher_interview_gap_report.labels.notes_placeholder",
                )}
                className="w-full resize-y rounded-lg border border-m3-outline-variant/30 bg-m3-surface px-3 py-2.5 text-sm text-m3-on-surface placeholder:text-m3-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-m3-primary/30"
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  disabled={saveNotes.isPending}
                  onClick={() => setEditing(false)}
                >
                  <X className="h-3.5 w-3.5" />
                  {t("teacher_interview_gap_report.labels.cancel")}
                </Button>
                <Button
                  size="sm"
                  className="gap-1 text-xs"
                  disabled={saveNotes.isPending}
                  onClick={() => void handleSave()}
                >
                  {saveNotes.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {saveNotes.isPending
                    ? t("teacher_interview_gap_report.labels.saving")
                    : t("teacher_interview_gap_report.labels.save")}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Saved note (or empty hint) — shown only when not editing. */}
        {!editing &&
          (teacherSummary ? (
            <p className="text-sm text-m3-on-surface leading-relaxed whitespace-pre-wrap">
              {teacherSummary}
            </p>
          ) : (
            <p className="text-sm italic text-m3-on-surface-variant">
              {t("teacher_interview_gap_report.labels.notes_empty")}
            </p>
          ))}
      </div>
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
        <h2 className="font-headline font-bold text-base text-m3-primary mb-2">
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
      <h2 className="font-headline font-bold text-base text-m3-primary mb-2">
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
                  {humanResources(item.suggested_resources).length > 0 && (
                    <p className="text-xs text-m3-on-surface-variant mt-1">
                      {humanResources(item.suggested_resources).join(" • ")}
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
      <h2 className="font-headline font-bold text-base text-m3-primary mb-2">
        {t("teacher_interview_gap_report.sections.sources")}
      </h2>
      <ul className="space-y-2">
        {sources.map((s) => (
          <li
            key={s.value}
            className="flex items-center justify-between gap-3 rounded-xl bg-m3-surface-container-low px-3 py-2 text-xs"
          >
            <span className="text-m3-on-surface-variant shrink-0">{s.label}</span>
            <span className="font-mono font-bold text-m3-on-surface truncate">
              {s.value.slice(0, 8)}
            </span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
