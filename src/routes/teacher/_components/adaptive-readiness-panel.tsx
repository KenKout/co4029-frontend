import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  Gauge,
  Loader2,
  Target,
  TriangleAlert,
} from "lucide-react";

import { useAdaptiveReadiness } from "@/lib/api/hooks/interviews";
import type {
  AdaptiveReadinessWarning,
  InterviewOutcomeAuthoring,
  InterviewQuestionAuthoring,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Tabs the panel can deep-link to when a warning is actionable. */
type ReadinessTab = "settings" | "generate" | "questions";

// Rough authoring heuristic — mirrors the backend `_MINUTES_PER_QUESTION` so
// the estimated-length readout matches the coverage warning's math.
const MINUTES_PER_QUESTION = 4;

// Which tab a given warning code is fixed on, so each warning can offer a
// jump-to action. Codes not in the map render without an action button.
const WARNING_TAB: Record<string, ReadinessTab> = {
  questions_without_outcome: "questions",
  outcomes_without_question: "settings",
  questions_missing_difficulty: "questions",
  low_difficulty_diversity: "questions",
  insufficient_question_coverage: "generate",
};

/**
 * Adaptive Readiness panel (Slice 5).
 *
 * Advisory-only surface for the interview authoring workspace: it tells the
 * teacher whether the adaptive interviewer has enough structured material
 * (outcome links, difficulty labels, coverage) to adapt well, and which input
 * modes currently run the adaptive brain. It NEVER blocks publishing — the hard
 * publish gates (>=1 approved question, >=1 outcome) live on the backend
 * /publish endpoint. Warning copy is localized from the machine `code`.
 *
 * When the parent passes the already-loaded `questions` / `outcomes` /
 * `timeLimitMinutes`, the panel enriches the advisory report with an at-a-glance
 * coverage summary (approved pool, outcome coverage, difficulty mix, estimated
 * length). These props are optional so the panel still works standalone.
 */
export function AdaptiveReadinessPanel({
  configId,
  questions,
  outcomes,
  timeLimitMinutes,
  onGoTo,
}: {
  configId: string;
  questions?: InterviewQuestionAuthoring[];
  outcomes?: InterviewOutcomeAuthoring[];
  timeLimitMinutes?: number | null;
  onGoTo?: (tab: ReadinessTab) => void;
}) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useAdaptiveReadiness(configId);

  const hasContext = Array.isArray(questions) && Array.isArray(outcomes);

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-m3-secondary" aria-hidden="true" />
            <h3 className="text-base font-semibold text-m3-on-surface">
              {t("teacher_interview_config.readiness.title")}
            </h3>
          </div>
          <p className="mt-1 text-sm text-m3-on-surface-variant">
            {t("teacher_interview_config.readiness.subtitle")}
          </p>
        </div>
        {data ? <StatusPill count={data.warnings.length} /> : null}
      </div>

      {isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-m3-on-surface-variant">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t("teacher_interview_config.readiness.loading")}
        </div>
      ) : isError ? (
        <p className="mt-4 text-sm text-m3-on-surface-variant">
          {t("teacher_interview_config.readiness.error")}
        </p>
      ) : data ? (
        <>
          {hasContext && (
            <CoverageStats
              questions={questions ?? []}
              outcomes={outcomes ?? []}
              timeLimitMinutes={timeLimitMinutes ?? null}
            />
          )}
          <ReadinessWarnings warnings={data.warnings} onGoTo={onGoTo} />
          <RolloutStatus rollout={data.rollout} />
        </>
      ) : null}
    </div>
  );
}

// Header status pill — green "ready" when there are no advisory items, amber
// "N to review" otherwise. Advisory only; never a publish gate.
function StatusPill({ count }: { count: number }) {
  const { t } = useTranslation();
  const ready = count === 0;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
      )}
    >
      {ready ? (
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {ready
        ? t("teacher_interview_config.readiness.status_ready")
        : t("teacher_interview_config.readiness.status_review", { count })}
    </span>
  );
}

const DIFFICULTY_KEYS = ["junior", "mid_level", "senior"] as const;

// At-a-glance coverage metrics computed from the approved question pool and
// the outcome set the parent already loaded — no extra fetch.
function CoverageStats({
  questions,
  outcomes,
  timeLimitMinutes,
}: {
  questions: InterviewQuestionAuthoring[];
  outcomes: InterviewOutcomeAuthoring[];
  timeLimitMinutes: number | null;
}) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const approved = questions.filter((q) => q.review_status === "approved");
    const linkedOutcomeIds = new Set(
      approved
        .map((q) => q.linked_outcome_id)
        .filter((id): id is string => Boolean(id)),
    );
    const coveredOutcomes = outcomes.filter((o) =>
      linkedOutcomeIds.has(o.id),
    ).length;
    const diff: Record<string, number> = {
      junior: 0,
      mid_level: 0,
      senior: 0,
      unlabeled: 0,
    };
    for (const q of approved) {
      const key = q.difficulty ?? "unlabeled";
      diff[key] = (diff[key] ?? 0) + 1;
    }
    return {
      approvedCount: approved.length,
      outcomeCount: outcomes.length,
      coveredOutcomes,
      diff,
      estMinutes: approved.length * MINUTES_PER_QUESTION,
    };
  }, [questions, outcomes]);

  if (stats.approvedCount === 0) {
    return (
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-m3-surface-container-lowest p-3 text-sm text-m3-on-surface-variant">
        <ClipboardList className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{t("teacher_interview_config.readiness.no_questions_yet")}</span>
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat
        icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />}
        label={t("teacher_interview_config.readiness.stat_approved_questions")}
        value={String(stats.approvedCount)}
        stagger={0}
      />
      <Stat
        icon={<Target className="h-4 w-4" aria-hidden="true" />}
        label={t("teacher_interview_config.readiness.stat_outcomes_covered")}
        value={`${stats.coveredOutcomes}/${stats.outcomeCount}`}
        stagger={1}
        tone={
          stats.outcomeCount > 0 && stats.coveredOutcomes === stats.outcomeCount
            ? "good"
            : stats.coveredOutcomes === 0
              ? "warn"
              : "neutral"
        }
      />
      <Stat
        icon={<Gauge className="h-4 w-4" aria-hidden="true" />}
        label={t("teacher_interview_config.readiness.stat_est_length")}
        value={
          timeLimitMinutes
            ? t("teacher_interview_config.readiness.est_length_value", {
                minutes: stats.estMinutes,
              })
            : t("teacher_interview_config.readiness.est_length_untimed")
        }
        hint={
          timeLimitMinutes
            ? t("teacher_interview_config.readiness.est_length_limit", {
                minutes: timeLimitMinutes,
              })
            : undefined
        }
        tone={
          timeLimitMinutes && stats.estMinutes < timeLimitMinutes
            ? "warn"
            : "neutral"
        }
        stagger={2}
      />
      <div
        className="animate-[fade-in-up_0.35s_cubic-bezier(0.16,1,0.3,1)_both] rounded-xl border border-border bg-m3-surface-container-lowest p-3 transition-colors duration-200 hover:border-m3-primary/30"
        style={{ animationDelay: "180ms" }}
      >
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-m3-on-surface-variant">
          <Gauge className="h-4 w-4" aria-hidden="true" />
          {t("teacher_interview_config.readiness.stat_difficulty_mix")}
        </div>
        <div className="mt-1.5 space-y-1">
          {DIFFICULTY_KEYS.map((k) => (
            <div
              key={k}
              className="flex items-center justify-between text-[11px]"
            >
              <span className="text-m3-on-surface-variant">
                {t(`teacher_interview_config.difficulty.${k}`)}
              </span>
              <span className="font-semibold text-m3-on-surface">
                {stats.diff[k] ?? 0}
              </span>
            </div>
          ))}
          {stats.diff.unlabeled > 0 && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-amber-700">
                {t("teacher_interview_config.readiness.difficulty_unlabeled")}
              </span>
              <span className="font-semibold text-amber-700">
                {stats.diff.unlabeled}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
  tone = "neutral",
  stagger = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "warn" | "neutral";
  /** Position in the stat row, used to stagger the enter animation. */
  stagger?: number;
}) {
  return (
    <div
      className="animate-[fade-in-up_0.35s_cubic-bezier(0.16,1,0.3,1)_both] rounded-xl border border-border bg-m3-surface-container-lowest p-3 transition-colors duration-200 hover:border-m3-primary/30"
      style={{ animationDelay: `${Math.min(stagger, 5) * 60}ms` }}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-m3-on-surface-variant">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-lg font-bold leading-none",
          tone === "good" && "text-emerald-700",
          tone === "warn" && "text-amber-700",
          tone === "neutral" && "text-m3-on-surface",
        )}
      >
        {/* Keyed on the value so a change fades the new figure in instead of
            swapping the glyphs in place. Deliberately NOT AnimatedCounter:
            these values are pre-formatted strings ("3/5", "~12 min",
            "Untimed"), and that component only counts a leading number — it
            would mangle every one of them. */}
        <span
          key={value}
          className="inline-block animate-[fade-in-up_0.25s_ease-out_both]"
        >
          {value}
        </span>
      </div>
      {hint && (
        <div className="mt-0.5 text-[11px] text-m3-on-surface-variant">
          {hint}
        </div>
      )}
    </div>
  );
}

function ReadinessWarnings({
  warnings,
  onGoTo,
}: {
  warnings: AdaptiveReadinessWarning[];
  onGoTo?: (tab: ReadinessTab) => void;
}) {
  const { t } = useTranslation();

  if (warnings.length === 0) {
    return (
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-900">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{t("teacher_interview_config.readiness.all_clear")}</span>
      </div>
    );
  }

  return (
    <ul className="mt-4 space-y-2">
      {warnings.map((w, idx) => {
        const isWarning = w.level === "warning";
        const tab = WARNING_TAB[w.code];
        return (
          <li
            key={w.code}
            // Staggered so the list reads top-to-bottom instead of appearing as
            // one block. Capped at 5 steps (~300ms) so a long warning list never
            // makes the teacher wait to read the last item.
            style={{ animationDelay: `${Math.min(idx, 5) * 60}ms` }}
            className={cn(
              "flex items-start gap-2 rounded-xl border p-3 text-sm",
              "animate-[fade-in-up_0.35s_cubic-bezier(0.16,1,0.3,1)_both]",
              isWarning
                ? "border-amber-300 bg-amber-50/70 text-amber-900"
                : "border-sky-200 bg-sky-50/70 text-sky-900",
            )}
          >
            {isWarning ? (
              <TriangleAlert
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
            ) : (
              <CircleHelp
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
            )}
            <span className="flex-1">
              {t(`teacher_interview_config.readiness.warnings.${w.code}`, {
                count: w.count,
                defaultValue: t(
                  "teacher_interview_config.readiness.warnings.generic",
                  {
                    count: w.count,
                  },
                ),
              })}
            </span>
            {tab && onGoTo && (
              <Button variant="link"
                type="button"
                onClick={() => onGoTo(tab)}
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold underline-offset-2 hover:underline cursor-pointer h-auto whitespace-normal"
              >
                {t("teacher_interview_config.readiness.fix_action")}
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function RolloutStatus({
  rollout,
}: {
  rollout: { text: boolean; hybrid: boolean; voice: boolean };
}) {
  const { t } = useTranslation();
  const modes: { key: keyof typeof rollout; label: string }[] = [
    { key: "text", label: t("teacher_interview_config.readiness.modes.text") },
    {
      key: "hybrid",
      label: t("teacher_interview_config.readiness.modes.hybrid"),
    },
    {
      key: "voice",
      label: t("teacher_interview_config.readiness.modes.voice"),
    },
  ];

  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="text-sm font-medium text-m3-on-surface">
        {t("teacher_interview_config.readiness.rollout_title")}
      </p>
      <p className="mt-0.5 text-[11px] text-m3-on-surface-variant">
        {t("teacher_interview_config.readiness.rollout_hint")}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {modes.map((m) => {
          const on = rollout[m.key];
          return (
            <span
              key={m.key}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                on
                  ? "bg-violet-50 text-violet-700"
                  : "bg-m3-surface-container text-m3-on-surface-variant",
              )}
            >
              {m.label}:{" "}
              {on
                ? t("teacher_interview_config.readiness.rollout_on")
                : t("teacher_interview_config.readiness.rollout_off")}
            </span>
          );
        })}
      </div>
    </div>
  );
}
