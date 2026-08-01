import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { GlassCard } from "@/components/ui/glass-card";
import type { GapReportAuthoringRead } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { toneBand, violationLabel } from "./helpers";

/**
 * Teacher-only tone diagnostic: did the AI interviewer hold the configured
 * persona? Renders nothing when a session was never audited (older sessions,
 * no interviewer turns, or the judge was unavailable) so the tab stays clean.
 * This never affects the student's pass/fail — it is guidance for the teacher.
 */
export function PersonaAdherenceCard({
  report,
}: {
  report: GapReportAuthoringRead;
}) {
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
