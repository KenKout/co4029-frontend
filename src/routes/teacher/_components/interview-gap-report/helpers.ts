import type {
  CriterionChartRow,
  CriterionEntry,
  GroupedNotes,
  ScoreSummaryRollup,
  TranslateFn,
} from "./types";

/**
 * Pure helpers for the teacher gap-report screen, extracted from the former
 * 1.7k-line interview-gap-report.tsx. Kept free of React so the formatting and
 * report-aggregation logic can be unit-tested directly and shared between the
 * page shell and every panel without a component owning the definition.
 */

export function formatDate(value: string): string {
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

// Format seconds elapsed since the interview's first turn as m:ss (or h:mm:ss),
// mirroring the live interview session's relative timestamp (starts at 0:00).
export function formatRelativeTime(totalSeconds: number): string {
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

export function humanResources(resources: string[]): string[] {
  return resources.filter((r) => !UUID_RE.test(r.trim()));
}

// Split criterion-tagged bullets ("technical_accuracy: Cited bounds") into a
// map of criterion → note phrases. Bullets without a recognizable "tag:" prefix
// (or tagged with a non-rubric key like "theory_performance") are collected
// under a null key so they still surface as general notes.
export function groupNotesByCriterion(bullets: string[]): GroupedNotes {
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
export function scoreBand(score: number): {
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

export function criterionLabel(key: string, t: TranslateFn): string {
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

// Human-readable label for each violation tag the persona-adherence judge can
// emit. Falls back to a humanized tag so an unknown/new tag still renders.
export function violationLabel(tag: string, t: TranslateFn): string {
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
export function toneBand(score: number): {
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

/* ── Report aggregation ───────────────────────────────────────────────────── */

/** One row per rubric criterion, coercing a loosely-typed mean to a number. */
export function buildCriterionEntries(
  breakdown: Record<string, unknown>,
): CriterionEntry[] {
  return Object.entries(breakdown).map(([key, value]) => ({
    key,
    score: typeof value === "number" ? value : Number(value) || 0,
  }));
}

function asNum(v: unknown): number | null {
  return typeof v === "number"
    ? v
    : typeof v === "string" && v.trim()
      ? Number(v)
      : null;
}

/** The quantitative rollup that contextualizes the per-criterion means. */
export function readScoreSummary(
  summary: Record<string, unknown>,
): ScoreSummaryRollup {
  return {
    totalScore: asNum(summary.total_score),
    outcomesMet: asNum(summary.outcomes_met),
    outcomesTotal: asNum(summary.outcomes_total),
    answered: asNum(summary.questions_answered),
    questionsTotal: asNum(summary.questions_total),
  };
}

/**
 * Chart data: one row per rubric criterion with its 0–5 mean. Shared by the
 * radar (shape at a glance) and the horizontal bar (exact comparison).
 */
export function buildChartData(
  entries: CriterionEntry[],
  t: TranslateFn,
): CriterionChartRow[] {
  return entries.map(({ key, score }) => ({
    key,
    label: criterionLabel(key, t),
    score: Number(score.toFixed(2)),
  }));
}

/**
 * Notes tagged with a non-rubric criterion (e.g. "theory_performance") plus
 * any untagged bullets — shown once at the bottom so nothing is dropped.
 */
export function buildExtraNotes(
  grouped: GroupedNotes,
  rubricKeys: Set<string>,
  t: TranslateFn,
): string[] {
  return [
    ...[...grouped.byCriterion.entries()]
      .filter(([k]) => !rubricKeys.has(k))
      .flatMap(([k, notes]) =>
        notes.map((n) => `${criterionLabel(k, t)}: ${n}`),
      ),
    ...grouped.untagged,
  ];
}
