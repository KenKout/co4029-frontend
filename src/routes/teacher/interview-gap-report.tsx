import {
  Link,
  useNavigate,
  useParams,
  useRouter,
} from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Loader2,
  Maximize,
  MonitorX,
  ListFilter,
  Pencil,
  Save,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";
import {
  classifyMissingGapReport,
  gapReportReasonI18nKey,
} from "@/lib/interview/gap-report-availability";
import {
  useInterviewIntegrityEvents,
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

type GapTabId = "overview" | "analysis" | "transcript" | "integrity";

// Tabbed navigation for the gap-report page, mirroring the interview-config
// workspace: an absolutely-positioned pill measures the active tab and glides
// to it via CSS transform, so the colored indicator slides between tabs.
function GapTabBar({
  activeTab,
  onSelect,
  ariaLabel,
}: {
  activeTab: GapTabId;
  onSelect: (id: GapTabId) => void;
  ariaLabel: string;
}) {
  const { t } = useTranslation();
  const items: { id: GapTabId; label: string }[] = [
    { id: "overview", label: t("teacher_interview_gap_report.tabs.overview") },
    { id: "analysis", label: t("teacher_interview_gap_report.tabs.analysis") },
    {
      id: "transcript",
      label: t("teacher_interview_gap_report.tabs.transcript"),
    },
    {
      id: "integrity",
      label: t("teacher_interview_gap_report.tabs.integrity"),
    },
  ];

  const listRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState<{
    left: number;
    width: number;
    ready: boolean;
  }>({ left: 0, width: 0, ready: false });

  useLayoutEffect(() => {
    function measure() {
      const el = tabRefs.current.get(activeTab);
      const list = listRef.current;
      if (!el || !list) return;
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
    }
    measure();
    const list = listRef.current;
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    if (ro && list) {
      ro.observe(list);
      for (const el of tabRefs.current.values()) ro.observe(el);
    }
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeTab]);

  return (
    <nav
      aria-label={ariaLabel}
      className="sticky z-10 -mx-1 px-1"
      style={{ top: 64 }}
    >
      <div
        ref={listRef}
        role="tablist"
        aria-label={ariaLabel}
        className="relative flex items-stretch gap-1 overflow-x-auto no-scrollbar rounded-lg border border-border bg-white/95 p-1 shadow-sm backdrop-blur-sm lg:overflow-visible"
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1 bottom-1 rounded-md bg-m3-primary shadow-sm ring-1 ring-m3-primary",
            "motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out",
            indicator.ready ? "opacity-100" : "opacity-0",
          )}
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: indicator.width,
          }}
        />
        {items.map((item) => {
          const isActive = item.id === activeTab;
          return (
            <button
              key={item.id}
              id={`tab-${item.id}`}
              ref={(el) => {
                if (el) tabRefs.current.set(item.id, el);
                else tabRefs.current.delete(item.id);
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "group relative z-10 min-w-fit flex-1 rounded-md px-3 py-2 text-center transition-colors duration-300",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                "whitespace-nowrap cursor-pointer text-[13px] font-bold",
                isActive
                  ? "text-white"
                  : "text-m3-on-surface hover:bg-surface-muted",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default function InterviewGapReportPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();
  const { sessionId } = useParams({ strict: false }) as { sessionId: string };
  const {
    data: report,
    isLoading,
    isError,
    error,
  } = useTeacherGapReport(sessionId);
  const { data: session } = useTeacherInterviewSession(sessionId);

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
    // Never render `ApiError.message` here: it is `API ${status}: ${body}`, so a
    // routine "not graded yet" 404 leaked the raw
    // {"detail":{"error":"not_found","resource":"gap_report","id":...}} payload.
    //
    // The teacher-facing distinction is not the HTTP code but whether the report
    // is still coming: grading is async, so a `completed` session 404s for a
    // while and then works — but an `abandoned` session is never enqueued for
    // evaluation at all, so telling that teacher to "check back shortly" sends
    // them to wait for something that will never arrive.
    const apiStatus =
      error && typeof error === "object" && "status" in error
        ? (error as { status?: number }).status
        : undefined;
    const reason = classifyMissingGapReport(apiStatus, session?.status);
    const headingKey =
      reason === "never_graded"
        ? "teacher_interview_gap_report.empty_states.not_graded"
        : "teacher_interview_gap_report.empty_states.no_report";

    return (
      <div className="text-center py-24 text-m3-on-surface-variant space-y-4">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <FileText className="h-6 w-6" />
          </div>
        </div>
        <div>
          <p className="font-headline font-bold text-m3-on-surface">
            {t(headingKey)}
          </p>
          <p className="text-sm mt-1 max-w-md mx-auto">
            {t(gapReportReasonI18nKey(reason))}
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
        <ContextCard report={report} session={session ?? null} />
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

/* ── Integrity severity → colour (mirrors the quiz attempt-detail panel) ── */
const INTEGRITY_SEVERITY_META: Record<string, { badge: string; dot: string }> =
  {
    critical: { badge: "bg-red-100 text-red-700", dot: "bg-red-500" },
    warning: { badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
    info: { badge: "bg-blue-100 text-blue-700", dot: "bg-blue-400" },
  };

/* ── Integrity event type → icon + accent colour ──────────────────────────
 * Each proctoring signal gets its own icon and colour so the timeline reads at
 * a glance instead of a wall of identical amber rows. Colour follows the
 * event's inherent severity (tab switch / fullscreen exit = warning amber,
 * focus loss = informational blue). */
const INTEGRITY_EVENT_META: Record<
  string,
  { icon: typeof MonitorX; tint: string; iconBg: string }
> = {
  tab_switch: {
    icon: MonitorX,
    tint: "text-amber-600",
    iconBg: "bg-amber-50 text-amber-600",
  },
  focus_lost: {
    icon: Eye,
    tint: "text-blue-600",
    iconBg: "bg-blue-50 text-blue-600",
  },
  fullscreen_exit: {
    icon: Maximize,
    tint: "text-amber-600",
    iconBg: "bg-amber-50 text-amber-600",
  },
};

/** The sub-tabs inside Integrity: "all events" plus one per event type. */
type IntegrityFilter =
  | "total"
  | "tab_switch"
  | "fullscreen_exit"
  | "focus_lost";

/**
 * One filter tab in the integrity breakdown row.
 *
 * Doubles as the stat tile it replaced — the count is the headline, so the tabs
 * carry the same information the old passive tiles did while also being the
 * control that filters the timeline. `aria-pressed` (not `aria-selected`) because
 * these are toggle buttons in a group, not an ARIA tablist: the panel below is a
 * filtered list, not four separate panels.
 */
function IntegrityFilterTab({
  icon: Icon,
  count,
  label,
  title,
  selected,
  warning,
  onSelect,
}: {
  icon: typeof MonitorX;
  count: number;
  label: string;
  /** Full event wording, kept as the tooltip + accessible name when `label` is
      an abbreviation ("Switching" for "Switched away from the interview tab").
      The short form keeps four tabs readable on one row; the long form stays
      reachable so the abbreviation never has to be guessed at. */
  title?: string;
  selected: boolean;
  /** Warning-level type with at least one hit — tinted amber even when unselected. */
  warning: boolean;
  onSelect: () => void;
}) {
  const empty = count === 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      title={title ?? label}
      aria-label={title ? `${title} (${count})` : undefined}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border p-3 text-left",
        // Hover/press feedback: lift + shadow on the way in, settle on click.
        // transform+shadow+colour only, so this stays off the layout path.
        "cursor-pointer transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-editorial active:translate-y-0 active:scale-[0.98]",
        selected
          ? warning
            ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200"
            : "border-m3-primary/50 bg-m3-primary-fixed ring-2 ring-m3-primary/20"
          : warning
            ? "border-amber-200 bg-amber-50/50 hover:border-amber-300"
            : "border-border bg-surface-muted/40 hover:border-m3-primary/30",
        // An empty bucket is still clickable (it explains the zero), but it
        // should not compete for attention with one that has hits.
        empty && !selected && "opacity-70 hover:opacity-100",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
          selected
            ? warning
              ? "bg-amber-200 text-amber-900"
              : "bg-m3-primary text-white"
            : warning
              ? "bg-amber-100 text-amber-700"
              : "bg-white text-text-subtle group-hover:text-m3-primary",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "text-lg font-bold leading-none tabular-nums transition-colors duration-200",
            selected
              ? warning
                ? "text-amber-900"
                : "text-m3-primary"
              : warning
                ? "text-amber-800"
                : "text-text-subtle",
          )}
        >
          {count}
        </p>
        <p className="mt-1 truncate text-[11px] font-medium text-m3-on-surface-variant">
          {label}
        </p>
      </div>
    </button>
  );
}

// FR-5.8 teacher review surface: the proctoring-signal timeline for a session.
// Signals are recorded across every mode (text / hybrid / voice) — see Gap 1.
// A clean session shows a reassuring green state rather than an empty box.
/** Exported for tests: asserts the sub-tab filtering of the event timeline. */
export function IntegrityCard({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useInterviewIntegrityEvents(sessionId);
  const events = data?.events ?? [];
  const [filter, setFilter] = useState<IntegrityFilter>("total");

  const counts = {
    total: events.length,
    tabSwitch: events.filter((e) => e.event_type === "tab_switch").length,
    focusLost: events.filter((e) => e.event_type === "focus_lost").length,
    fullscreenExit: events.filter((e) => e.event_type === "fullscreen_exit")
      .length,
  };
  // Warning-level signals (tab switches + fullscreen exits) are what actually
  // matter for integrity; focus losses alone are noisy/low-signal. Grade the
  // overall risk off the warning count so the teacher gets an at-a-glance read
  // rather than having to eyeball a long list.
  const warningCount = counts.tabSwitch + counts.fullscreenExit;
  const risk: "low" | "moderate" | "high" =
    warningCount === 0 ? "low" : warningCount <= 3 ? "moderate" : "high";

  // The timeline shows one bucket at a time. "total" keeps the full chronology;
  // the other three narrow to a single event_type so a teacher can read the tab
  // switches without scrolling past interleaved focus-loss noise.
  const visibleEvents =
    filter === "total" ? events : events.filter((e) => e.event_type === filter);

  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 text-sm text-m3-on-surface-variant">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("common.loading")}
        </div>
      </GlassCard>
    );
  }

  if (counts.total === 0) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="shrink-0 rounded-lg bg-emerald-100 p-2 text-emerald-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-headline text-sm font-bold text-emerald-800">
              {t("teacher_interview_gap_report.integrity.clean_title")}
            </h3>
            <p className="mt-0.5 text-xs text-emerald-700/80">
              {t("teacher_interview_gap_report.integrity.clean_body")}
            </p>
          </div>
        </div>
      </GlassCard>
    );
  }

  const RISK_META = {
    low: {
      icon: ShieldCheck,
      wrap: "border-emerald-200 bg-emerald-50/60",
      iconBg: "bg-emerald-100 text-emerald-700",
      title: "text-emerald-800",
      body: "text-emerald-700/80",
    },
    moderate: {
      icon: AlertTriangle,
      wrap: "border-amber-200 bg-amber-50/60",
      iconBg: "bg-amber-100 text-amber-700",
      title: "text-amber-800",
      body: "text-amber-700/80",
    },
    high: {
      icon: ShieldAlert,
      wrap: "border-red-200 bg-red-50/60",
      iconBg: "bg-red-100 text-red-700",
      title: "text-red-800",
      body: "text-red-700/80",
    },
  } as const;
  const riskMeta = RISK_META[risk];
  const RiskIcon = riskMeta.icon;

  return (
    <GlassCard className="overflow-hidden p-0">
      {/* Risk banner: overall read graded off warning-level signals. */}
      <div className="border-b border-border p-5">
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border p-4",
            riskMeta.wrap,
          )}
        >
          <div className={cn("shrink-0 rounded-lg p-2", riskMeta.iconBg)}>
            <RiskIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className={cn(
                  "font-headline text-sm font-bold",
                  riskMeta.title,
                )}
              >
                {t(`teacher_interview_gap_report.integrity.risk.${risk}_title`)}
              </h3>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  riskMeta.iconBg,
                )}
              >
                {t(`teacher_interview_gap_report.integrity.risk.${risk}_badge`)}
              </span>
            </div>
            <p className={cn("mt-1 text-xs", riskMeta.body)}>
              {t(`teacher_interview_gap_report.integrity.risk.${risk}_body`, {
                count: warningCount,
              })}
            </p>
          </div>
        </div>

        {/* Per-type breakdown, doubling as the filter for the timeline below.
            Four buckets: everything, then one per event type. Clicking one shows
            only that type, so a teacher can read the 7 tab switches without
            scrolling past 14 interleaved focus-loss rows. */}
        <div
          className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4"
          role="group"
          aria-label={t(
            "teacher_interview_gap_report.integrity.filter_group_label",
          )}
        >
          <IntegrityFilterTab
            icon={ListFilter}
            count={counts.total}
            selected={filter === "total"}
            warning={false}
            onSelect={() => setFilter("total")}
            label={t("teacher_interview_gap_report.integrity.filter.total")}
          />
          <IntegrityFilterTab
            icon={MonitorX}
            count={counts.tabSwitch}
            selected={filter === "tab_switch"}
            warning={counts.tabSwitch > 0}
            onSelect={() => setFilter("tab_switch")}
            label={t(
              "teacher_interview_gap_report.integrity.filter.tab_switch",
            )}
            title={t("teacher_interview_gap_report.integrity.event.tab_switch")}
          />
          <IntegrityFilterTab
            icon={Maximize}
            count={counts.fullscreenExit}
            selected={filter === "fullscreen_exit"}
            warning={counts.fullscreenExit > 0}
            onSelect={() => setFilter("fullscreen_exit")}
            label={t(
              "teacher_interview_gap_report.integrity.filter.fullscreen_exit",
            )}
            title={t(
              "teacher_interview_gap_report.integrity.event.fullscreen_exit",
            )}
          />
          <IntegrityFilterTab
            icon={Eye}
            count={counts.focusLost}
            selected={filter === "focus_lost"}
            warning={false}
            onSelect={() => setFilter("focus_lost")}
            label={t(
              "teacher_interview_gap_report.integrity.filter.focus_lost",
            )}
            title={t("teacher_interview_gap_report.integrity.event.focus_lost")}
          />
        </div>
      </div>

      {/* Chronological timeline, narrowed to the selected bucket. */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <h4 className="text-[11px] font-bold uppercase tracking-wide text-text-subtle">
          {t("teacher_interview_gap_report.integrity.timeline_title")}
        </h4>
        <span className="shrink-0 text-[11px] tabular-nums text-m3-on-surface-variant">
          {t("teacher_interview_gap_report.integrity.showing_count", {
            count: visibleEvents.length,
          })}
        </span>
      </div>
      {visibleEvents.length === 0 ? (
        // A zero bucket is reachable on purpose (the tab shows its 0), so it needs
        // to say why it is empty instead of rendering a blank strip.
        <div className="px-5 py-6">
          <p className="rounded-xl border border-dashed border-border bg-surface-muted/40 px-4 py-6 text-center text-xs text-m3-on-surface-variant">
            {t("teacher_interview_gap_report.integrity.filter_empty")}
          </p>
        </div>
      ) : (
        <ol
          // Keyed on the filter so switching buckets replays the entrance
          // animation and makes the list visibly change even when two buckets
          // happen to have a similar-looking first row.
          key={filter}
          className="max-h-80 animate-[fade-in-up_0.25s_ease-out_backwards] overflow-y-auto px-5 py-3"
        >
          {visibleEvents.map((ev, index) => {
            const eventMeta =
              INTEGRITY_EVENT_META[ev.event_type] ??
              INTEGRITY_EVENT_META.focus_lost;
            const severityMeta =
              INTEGRITY_SEVERITY_META[ev.severity] ??
              INTEGRITY_SEVERITY_META.info;
            const Icon = eventMeta.icon;
            const isLast = index === visibleEvents.length - 1;
            return (
              <li key={ev.id} className="group flex gap-3">
                {/* Timeline rail: dot + connecting line. */}
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full",
                      "transition-transform duration-200 group-hover:scale-110",
                      eventMeta.iconBg,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {!isLast && <span className="w-px flex-1 bg-border" />}
                </div>
                <div
                  className={cn(
                    "-mx-2 mb-1 flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-2 pb-3 pt-0.5",
                    "transition-colors duration-200 group-hover:bg-m3-surface-container-low",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-m3-on-surface">
                    {t(
                      `teacher_interview_gap_report.integrity.event.${ev.event_type}`,
                      { defaultValue: ev.event_type },
                    )}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      severityMeta.badge,
                    )}
                  >
                    {t(
                      `teacher_interview_gap_report.integrity.severity.${ev.severity}`,
                      { defaultValue: ev.severity },
                    )}
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-m3-on-surface-variant">
                    {formatDate(ev.created_at)}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </GlassCard>
  );
}

function TranscriptCard({
  sessionId,
  studentName,
}: {
  sessionId: string;
  studentName: string | null;
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useInterviewTranscript(sessionId);
  const turns = data?.turns ?? [];
  const [page, setPage] = useState(0);

  // Baseline for relative timestamps: the first turn is 0:00, every later turn
  // is its offset from that first turn (matches the live interview session).
  const baseline =
    turns.length > 0 ? new Date(turns[0].created_at).getTime() : 0;

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
        <p className="text-sm text-m3-on-surface-variant">
          {t("common.loading")}
        </p>
      )}
      {!isLoading && turns.length === 0 && (
        <p className="text-sm text-m3-on-surface-variant">
          {t("teacher_interview_gap_report.transcript.empty")}
        </p>
      )}
      {turns.length > 0 && (
        <>
          <ul className="space-y-3">
            {pageTurns.map((turn, idx) => {
              // Only show the question prompt when a NEW question starts —
              // i.e. when this turn's prompt differs from the previous turn's.
              // The same prompt is attached to every turn of a question
              // (the answer, clarify requests, AI rephrases), so rendering it
              // each time repeats the full question and makes the log messy.
              const absoluteIdx = start + idx;
              const prevPrompt =
                absoluteIdx > 0
                  ? (turns[absoluteIdx - 1].question_prompt ?? null)
                  : null;
              const showPrompt =
                Boolean(turn.question_prompt) &&
                turn.question_prompt !== prevPrompt;
              return (
                <li
                  key={absoluteIdx}
                  className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low p-3 space-y-1"
                >
                  {/* Header line: speaker on the left, timestamp on the far
                      right. The speaker label is on its own line so the timer
                      can never collide with a long question prompt or answer. */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-m3-primary">
                      {turn.role === "user" && studentName
                        ? studentName
                        : t(
                            `teacher_interview_gap_report.transcript.role.${turn.role}`,
                          )}
                    </span>
                    {/* Relative timestamp (0:00 = first turn), pushed to the far right. */}
                    <time className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-m3-primary">
                      {formatRelativeTime(
                        (new Date(turn.created_at).getTime() - baseline) / 1000,
                      )}
                    </time>
                  </div>
                  {showPrompt && (
                    <p className="text-[11px] font-semibold text-m3-outline uppercase tracking-widest">
                      {turn.question_prompt}
                    </p>
                  )}
                  {/* Content always begins below the header line. */}
                  <p className="text-sm text-m3-on-surface leading-relaxed">
                    {turn.content_text ??
                      (turn.has_audio
                        ? t(
                            "teacher_interview_gap_report.transcript.audio_only",
                          )
                        : "—")}
                  </p>
                </li>
              );
            })}
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

function ContextRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase font-bold tracking-widest text-m3-on-surface-variant/70">
        {label}
      </p>
      <p className="text-sm font-semibold text-m3-on-surface truncate">
        {value}
      </p>
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
  // Exact duration in whole seconds (not rounded to minutes) so the teacher
  // sees the true attempt length, e.g. "2m 23s".
  const durationSec =
    startedAt && endedAt
      ? Math.max(
          0,
          Math.round(
            (new Date(endedAt).getTime() - new Date(startedAt).getTime()) /
              1000,
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
        {durationSec != null && (
          <ContextRow
            label={t("teacher_interview_gap_report.labels.duration")}
            value={t("teacher_interview_gap_report.labels.duration_value", {
              minutes: Math.floor(durationSec / 60),
              seconds: String(durationSec % 60).padStart(2, "0"),
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
  studyPlan,
  courseId,
}: {
  sessionId: string;
  teacherSummary: string | null | undefined;
  studyPlan: StudyPlanItem[];
  courseId: string | null | undefined;
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
            editing
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
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

      {/* Study plan — merged into the Notes card as its own section. Each
          suggestion links to its lesson's materials page when a lesson is
          known, so the teacher can jump straight to the remediation content. */}
      <div className="mt-4 space-y-2.5">
        <p className="text-[11px] uppercase font-bold tracking-widest text-m3-on-surface-variant">
          {t("teacher_interview_gap_report.sections.study_plan")}
        </p>
        {studyPlan.length === 0 ? (
          <p className="text-sm italic text-m3-on-surface-variant">
            {t("teacher_interview_gap_report.empty_states.no_study_plan")}
          </p>
        ) : (
          <ol className="space-y-2.5">
            {studyPlan.map((item, idx) => {
              const resources = humanResources(item.suggested_resources);
              const canLink = Boolean(courseId && item.lesson_id);
              const body = (
                <div className="flex items-start gap-2">
                  <span className="shrink-0 h-6 w-6 rounded-full bg-m3-primary text-white flex items-center justify-center text-xs font-extrabold">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-m3-on-surface inline-flex items-center gap-1">
                      {item.topic}
                      {canLink && (
                        <ChevronRight className="h-3.5 w-3.5 text-m3-primary shrink-0" />
                      )}
                    </p>
                    {resources.length > 0 && (
                      <p className="text-xs text-m3-on-surface-variant mt-1">
                        {resources.join(" • ")}
                      </p>
                    )}
                  </div>
                </div>
              );
              return (
                <li
                  key={`${item.topic}-${idx}`}
                  className="rounded-xl bg-m3-surface-container-low p-3"
                >
                  {canLink ? (
                    <Link
                      to="/teacher/courses/$courseId/lessons/$lessonId"
                      params={{
                        courseId: courseId as string,
                        lessonId: item.lesson_id as string,
                      }}
                      className="block transition-colors hover:bg-m3-surface-container rounded-lg -m-1 p-1"
                    >
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </GlassCard>
  );
}

// Split criterion-tagged bullets ("technical_accuracy: Cited bounds") into a
// map of criterion → note phrases. Bullets without a recognizable "tag:" prefix
// (or tagged with a non-rubric key like "theory_performance") are collected
// under a null key so they still surface as general notes.
function groupNotesByCriterion(bullets: string[]): {
  byCriterion: Map<string, string[]>;
  untagged: string[];
} {
  const byCriterion = new Map<string, string[]>();
  const untagged: string[] = [];
  for (const bullet of bullets) {
    const idx = bullet.indexOf(":");
    if (idx > 0) {
      const tag = bullet.slice(0, idx).trim();
      const note = bullet.slice(idx + 1).trim();
      if (tag && note && !tag.includes(" ")) {
        const arr = byCriterion.get(tag) ?? [];
        arr.push(note);
        byCriterion.set(tag, arr);
        continue;
      }
    }
    const cleaned = bullet.trim();
    if (cleaned) untagged.push(cleaned);
  }
  return { byCriterion, untagged };
}

// 0–5 mean → band + tailwind classes for the score bar + label.
function scoreBand(score: number): {
  labelKey: string;
  bar: string;
  text: string;
} {
  if (score >= 4)
    return {
      labelKey: "band_strong",
      bar: "bg-emerald-500",
      text: "text-emerald-700",
    };
  if (score >= 2.5)
    return {
      labelKey: "band_developing",
      bar: "bg-amber-500",
      text: "text-amber-700",
    };
  return { labelKey: "band_weak", bar: "bg-red-500", text: "text-red-600" };
}

function criterionLabel(
  key: string,
  t: (k: string, opts?: Record<string, unknown>) => string,
): string {
  // Known rubric criteria get proper i18n labels; unknown keys are humanized
  // (snake_case → Title Case) so the card never shows a raw machine key.
  const label = t(`teacher_interview_gap_report.criteria.${key}`, {
    defaultValue: "",
  });
  if (label) return label;
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function CriterionBreakdown({ report }: { report: GapReportAuthoringRead }) {
  const { t } = useTranslation();
  const breakdown = report.per_criterion_breakdown ?? {};
  const weights = (report.rubric_weights ?? {}) as Record<string, number>;
  const summary = (report.score_summary ?? {}) as Record<string, unknown>;
  const strengths = groupNotesByCriterion(report.strengths ?? []);
  const weaknesses = groupNotesByCriterion(report.weaknesses ?? []);

  const entries = Object.entries(breakdown).map(([key, value]) => ({
    key,
    score: typeof value === "number" ? value : Number(value) || 0,
  }));

  const asNum = (v: unknown): number | null =>
    typeof v === "number"
      ? v
      : typeof v === "string" && v.trim()
        ? Number(v)
        : null;
  const totalScore = asNum(summary.total_score);
  const outcomesMet = asNum(summary.outcomes_met);
  const outcomesTotal = asNum(summary.outcomes_total);
  const answered = asNum(summary.questions_answered);
  const questionsTotal = asNum(summary.questions_total);

  // Notes tagged with a non-rubric criterion (e.g. "theory_performance") plus
  // any untagged bullets — shown once at the bottom so nothing is dropped.
  const rubricKeys = new Set(entries.map((e) => e.key));
  const extraStrengths = [
    ...[...strengths.byCriterion.entries()]
      .filter(([k]) => !rubricKeys.has(k))
      .flatMap(([k, notes]) =>
        notes.map((n) => `${criterionLabel(k, t)}: ${n}`),
      ),
    ...strengths.untagged,
  ];
  const extraWeaknesses = [
    ...[...weaknesses.byCriterion.entries()]
      .filter(([k]) => !rubricKeys.has(k))
      .flatMap(([k, notes]) =>
        notes.map((n) => `${criterionLabel(k, t)}: ${n}`),
      ),
    ...weaknesses.untagged,
  ];

  // Chart data: one row per rubric criterion with its 0–5 mean. Shared by the
  // radar (shape at a glance) and the horizontal bar (exact comparison).
  const chartData = entries.map(({ key, score }) => ({
    key,
    label: criterionLabel(key, t),
    score: Number(score.toFixed(2)),
  }));
  // Radar needs 3+ axes to form a shape; with 1–2 criteria a bar chart alone
  // reads better, so only show the radar when there are enough axes.
  const showRadar = chartData.length >= 3;

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

      {/* Quantitative rollup: the numbers that contextualize the per-criterion
          means (weighted total, outcomes met, questions answered). */}
      {(totalScore !== null ||
        outcomesTotal !== null ||
        questionsTotal !== null) && (
        <div className="grid grid-cols-3 gap-2">
          {totalScore !== null && (
            <div className="rounded-xl bg-m3-surface-container-low p-3 text-center">
              <p className="text-lg font-extrabold text-m3-primary tabular-nums">
                {Math.round(totalScore)}
                <span className="text-xs font-medium text-m3-on-surface-variant">
                  /100
                </span>
              </p>
              <p className="text-[10px] uppercase tracking-wider text-m3-on-surface-variant mt-0.5">
                {t("teacher_interview_gap_report.labels.total_score")}
              </p>
            </div>
          )}
          {outcomesTotal !== null && (
            <div className="rounded-xl bg-m3-surface-container-low p-3 text-center">
              <p className="text-lg font-extrabold text-m3-on-surface tabular-nums">
                {outcomesMet ?? 0}
                <span className="text-xs font-medium text-m3-on-surface-variant">
                  /{outcomesTotal}
                </span>
              </p>
              <p className="text-[10px] uppercase tracking-wider text-m3-on-surface-variant mt-0.5">
                {t("teacher_interview_gap_report.labels.outcomes_met")}
              </p>
            </div>
          )}
          {questionsTotal !== null && (
            <div className="rounded-xl bg-m3-surface-container-low p-3 text-center">
              <p className="text-lg font-extrabold text-m3-on-surface tabular-nums">
                {answered ?? 0}
                <span className="text-xs font-medium text-m3-on-surface-variant">
                  /{questionsTotal}
                </span>
              </p>
              <p className="text-[10px] uppercase tracking-wider text-m3-on-surface-variant mt-0.5">
                {t("teacher_interview_gap_report.labels.answered")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Visual per-criterion score charts: radar for the overall shape and a
          horizontal bar for exact comparison. Both read the same 0–5 means. */}
      {chartData.length > 0 && (
        <div className={showRadar ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
          {showRadar && (
            <div className="rounded-xl bg-m3-surface-container-lowest p-2">
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={chartData} outerRadius="72%">
                  <PolarGrid stroke="var(--border)" opacity={0.6} />
                  <PolarAngleAxis
                    dataKey="label"
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 5]}
                    tickCount={6}
                    tick={{ fill: "var(--text-muted)", fontSize: 9 }}
                    stroke="var(--border)"
                  />
                  <Radar
                    dataKey="score"
                    stroke="var(--primary)"
                    fill="var(--primary)"
                    fillOpacity={0.35}
                    isAnimationActive={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--surface-elev)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--text-strong)",
                    }}
                    formatter={(value) => [`${value} / 5`, ""]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="rounded-xl bg-m3-surface-container-lowest p-2">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
              >
                <CartesianGrid
                  horizontal={false}
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  opacity={0.5}
                />
                <XAxis
                  type="number"
                  domain={[0, 5]}
                  tickCount={6}
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  stroke="var(--border)"
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={110}
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  stroke="var(--border)"
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-muted)", opacity: 0.4 }}
                  contentStyle={{
                    backgroundColor: "var(--surface-elev)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--text-strong)",
                  }}
                  formatter={(value) => [`${value} / 5`, ""]}
                />
                <Bar
                  dataKey="score"
                  radius={[0, 6, 6, 0]}
                  isAnimationActive={false}
                >
                  {chartData.map((row) => {
                    const band = scoreBand(row.score);
                    return (
                      <Cell
                        key={row.key}
                        fill={
                          band.bar === "bg-emerald-500"
                            ? "var(--success)"
                            : band.bar === "bg-amber-500"
                              ? "var(--warning)"
                              : "var(--danger)"
                        }
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-sm italic text-m3-on-surface-variant">
          {t("teacher_interview_gap_report.empty_states.no_detail")}
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map(({ key, score }) => {
            const band = scoreBand(score);
            const pct = Math.max(0, Math.min(100, (score / 5) * 100));
            const weight = weights[key];
            const good = strengths.byCriterion.get(key) ?? [];
            const bad = weaknesses.byCriterion.get(key) ?? [];
            return (
              <li
                key={key}
                className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-m3-on-surface leading-snug">
                    {criterionLabel(key, t)}
                    {typeof weight === "number" && weight > 0 && (
                      <span className="ml-2 text-[10px] font-medium text-m3-on-surface-variant">
                        {t("teacher_interview_gap_report.labels.weight", {
                          pct: Math.round(weight * 100),
                        })}
                      </span>
                    )}
                  </p>
                  <span
                    className={`shrink-0 text-sm font-extrabold tabular-nums ${band.text}`}
                  >
                    {score.toFixed(1)}
                    <span className="text-[10px] font-medium text-m3-on-surface-variant">
                      /5
                    </span>
                  </span>
                </div>
                {/* Quantitative score bar */}
                <div className="h-2 w-full rounded-full bg-m3-outline-variant/20 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${band.bar} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {/* Qualitative per-criterion notes from the judge */}
                {good.map((note, i) => (
                  <p
                    key={`g-${i}`}
                    className="text-xs text-emerald-700 leading-relaxed pl-2 border-l-2 border-emerald-300"
                  >
                    <span className="font-bold mr-1">+</span>
                    {note}
                  </p>
                ))}
                {bad.map((note, i) => (
                  <p
                    key={`b-${i}`}
                    className="text-xs text-red-600 leading-relaxed pl-2 border-l-2 border-red-300"
                  >
                    <span className="font-bold mr-1">−</span>
                    {note}
                  </p>
                ))}
              </li>
            );
          })}
        </ul>
      )}

      {/* Notes not tied to a rubric criterion (e.g. theory/practice gap) */}
      {(extraStrengths.length > 0 || extraWeaknesses.length > 0) && (
        <div className="rounded-xl bg-m3-surface-container-low p-4 space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider font-bold text-m3-on-surface-variant">
            {t("teacher_interview_gap_report.labels.other_notes")}
          </p>
          {extraStrengths.map((note, i) => (
            <p
              key={`eg-${i}`}
              className="text-xs text-emerald-700 leading-relaxed"
            >
              <span className="font-bold mr-1">+</span>
              {note}
            </p>
          ))}
          {extraWeaknesses.map((note, i) => (
            <p key={`eb-${i}`} className="text-xs text-red-600 leading-relaxed">
              <span className="font-bold mr-1">−</span>
              {note}
            </p>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

// Human-readable label for each violation tag the persona-adherence judge can
// emit. Falls back to a humanized tag so an unknown/new tag still renders.
function violationLabel(
  tag: string,
  t: (k: string, opts?: Record<string, unknown>) => string,
): string {
  const label = t(
    `teacher_interview_gap_report.persona_adherence.violations.${tag}`,
    {
      defaultValue: "",
    },
  );
  if (label) return label;
  return tag
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Tone-consistency score band (0–10) → color + label. Mirrors scoreBand's
// three-tier scheme so the persona card reads consistently with the rubric.
function toneBand(score: number): {
  bar: string;
  text: string;
  labelKey: string;
} {
  if (score >= 8)
    return {
      bar: "bg-emerald-500",
      text: "text-emerald-700",
      labelKey: "band_consistent",
    };
  if (score >= 5)
    return {
      bar: "bg-amber-500",
      text: "text-amber-700",
      labelKey: "band_mixed",
    };
  return { bar: "bg-red-500", text: "text-red-600", labelKey: "band_off" };
}

/**
 * Teacher-only tone diagnostic: did the AI interviewer hold the configured
 * persona? Renders nothing when a session was never audited (older sessions,
 * no interviewer turns, or the judge was unavailable) so the tab stays clean.
 * This never affects the student's pass/fail — it is guidance for the teacher.
 */
function PersonaAdherenceCard({ report }: { report: GapReportAuthoringRead }) {
  const { t } = useTranslation();
  const audit = report.persona_adherence;
  // Absent or explicitly unavailable → don't render the card at all.
  if (!audit || audit.available === false) return null;
  const score =
    typeof audit.tone_consistency === "number" ? audit.tone_consistency : null;
  if (score === null) return null;

  const band = toneBand(score);
  const pct = Math.max(0, Math.min(100, (score / 10) * 100));
  const violations = audit.violations ?? [];
  const driftTurns = audit.drift_turns ?? [];
  // declared_answer is the one violation that touches grading fairness (the
  // interviewer leaked answer content), so surface it as a prominent warning.
  const hasAnswerLeak = violations.includes("declared_answer");

  return (
    <GlassCard className="p-6 space-y-4 mt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {score >= 8 ? (
            <ShieldCheck
              className="h-5 w-5 text-emerald-600"
              aria-hidden="true"
            />
          ) : (
            <ShieldAlert
              className="h-5 w-5 text-amber-600"
              aria-hidden="true"
            />
          )}
          <h2 className="font-headline font-bold text-base text-m3-primary">
            {t("teacher_interview_gap_report.persona_adherence.title")}
          </h2>
        </div>
        <span className="text-xs text-m3-on-surface-variant">
          {t("teacher_interview_gap_report.persona_adherence.tone_only")}
        </span>
      </div>

      {/* Headline tone-consistency score with a 0–10 bar. */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <span className={cn("text-sm font-bold", band.text)}>
            {t(
              `teacher_interview_gap_report.persona_adherence.${band.labelKey}`,
            )}
          </span>
          <span className="text-lg font-extrabold tabular-nums text-m3-on-surface">
            {score}
            <span className="text-xs font-medium text-m3-on-surface-variant">
              /10
            </span>
          </span>
        </div>
        <div className="h-2 rounded-full bg-m3-surface-container-high overflow-hidden">
          <div
            className={cn("h-full rounded-full", band.bar)}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Answer-leak warning — the most serious flag, elevated visually. */}
      {hasAnswerLeak && (
        <div className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3">
          <AlertTriangle
            className="h-4 w-4 shrink-0 text-red-600 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-xs text-red-700 leading-relaxed">
            {t(
              "teacher_interview_gap_report.persona_adherence.answer_leak_warning",
            )}
          </p>
        </div>
      )}

      {/* Observed traits (0–4) so the teacher compares intent vs. reality. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(
          [
            ["warmth_observed", "warmth"],
            ["directness_observed", "directness"],
            ["verbosity_observed", "verbosity"],
            ["formality_observed", "formality"],
          ] as const
        ).map(([field, labelKey]) => {
          const value = audit[field];
          if (typeof value !== "number") return null;
          return (
            <div
              key={field}
              className="rounded-xl bg-m3-surface-container-low p-3 text-center"
            >
              <p className="text-lg font-extrabold text-m3-on-surface tabular-nums">
                {value}
                <span className="text-xs font-medium text-m3-on-surface-variant">
                  /4
                </span>
              </p>
              <p className="text-[10px] uppercase tracking-wider text-m3-on-surface-variant mt-0.5">
                {t(
                  `teacher_interview_gap_report.persona_adherence.traits.${labelKey}`,
                )}
              </p>
            </div>
          );
        })}
      </div>

      {/* Non-leak violation tags, if any. */}
      {violations.filter((v) => v !== "declared_answer").length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {violations
            .filter((v) => v !== "declared_answer")
            .map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800"
              >
                {violationLabel(tag, t)}
              </span>
            ))}
        </div>
      )}

      {/* Judge's reasoning + which turns drifted. */}
      {audit.reasoning && (
        <div className="rounded-xl bg-m3-surface-container-lowest p-4 space-y-2">
          <p className="text-xs text-m3-on-surface leading-relaxed">
            {audit.reasoning}
          </p>
          {driftTurns.length > 0 && (
            <p className="text-[11px] text-m3-on-surface-variant">
              {t("teacher_interview_gap_report.persona_adherence.drift_turns", {
                turns: driftTurns.join(", "),
              })}
            </p>
          )}
        </div>
      )}
    </GlassCard>
  );
}
