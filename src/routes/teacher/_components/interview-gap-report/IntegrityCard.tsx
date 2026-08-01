import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { GlassCard } from "@/components/ui/glass-card";
import { useInterviewIntegrityEvents } from "@/lib/api/hooks/interviews";
import { IntegrityEventRow } from "./IntegrityEventRow";
import { IntegrityFilterRow } from "./IntegrityFilterRow";
import { IntegrityRiskBanner } from "./IntegrityRiskBanner";
import type { IntegrityFilter } from "./types";

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

  return (
    <GlassCard className="overflow-hidden p-0">
      <div className="border-b border-border p-5">
        <IntegrityRiskBanner risk={risk} warningCount={warningCount} />
        <IntegrityFilterRow
          counts={counts}
          filter={filter}
          onSelect={setFilter}
        />
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
          {visibleEvents.map((ev, index) => (
            <IntegrityEventRow
              key={ev.id}
              event={ev}
              isLast={index === visibleEvents.length - 1}
            />
          ))}
        </ol>
      )}
    </GlassCard>
  );
}
