/**
 * Shared types for the teacher gap-report screen, extracted from the former
 * 1.7k-line interview-gap-report.tsx so the tab bar, the panels and the page
 * shell can agree on one definition instead of re-declaring string unions.
 */

/** The four top-level tabs of the gap-report workspace. */
export type GapTabId = "overview" | "analysis" | "transcript" | "integrity";

/** The sub-tabs inside Integrity: "all events" plus one per event type. */
export type IntegrityFilter =
  | "total"
  | "tab_switch"
  | "fullscreen_exit"
  | "focus_lost";

/** Overall integrity read, graded off the warning-level signal count. */
export type IntegrityRisk = "low" | "moderate" | "high";

/** Per-type signal counts backing the integrity filter tabs. */
export interface IntegrityCounts {
  total: number;
  tabSwitch: number;
  focusLost: number;
  fullscreenExit: number;
}

/** One rubric criterion with its 0–5 mean. */
export interface CriterionEntry {
  key: string;
  score: number;
}

/** One radar/bar chart row: a criterion's label plus its rounded 0–5 mean. */
export interface CriterionChartRow {
  key: string;
  label: string;
  score: number;
}

/** The quantitative rollup read off `score_summary`. */
export interface ScoreSummaryRollup {
  totalScore: number | null;
  outcomesMet: number | null;
  outcomesTotal: number | null;
  answered: number | null;
  questionsTotal: number | null;
}

/** Criterion-tagged judge bullets, split by rubric key. */
export interface GroupedNotes {
  byCriterion: Map<string, string[]>;
  untagged: string[];
}

/** `t` narrowed to what the label helpers actually need. */
export type TranslateFn = (k: string, opts?: Record<string, unknown>) => string;
