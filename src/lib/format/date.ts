import { useTranslation } from "react-i18next";

/**
 * Central date/time formatting. Before this module, ~11 files each re-derived
 * `i18n.resolvedLanguage === "vi" ? "vi-VN" : "en-US"` and hand-rolled an
 * Intl formatter. The shared pieces:
 *
 *   - `resolveLocale` / `useAppLocale` — the one truly-duplicated bit: map the
 *     active i18n language to a BCP-47 locale.
 *   - pure `formatX(iso, locale)` presets — each reproduces one previously
 *     inlined output shape exactly (fallbacks included), so migrating a call
 *     site is behaviour-preserving.
 *   - `useFormatX()` hooks — bind a preset to the active locale for components.
 *   - pure duration helpers (`formatClock`, `formatDurationShort`,
 *     `formatElapsedLabel`) that never touched i18n.
 *
 * Prefer the `useFormatX` hooks in components; use the pure `formatX(iso,
 * locale)` forms when you already have a locale (e.g. inside a table cell
 * renderer that resolved it once).
 */

const EM_DASH = "—";

/** Map the active i18n language to a BCP-47 locale. */
export function resolveLocale(language: string | undefined): "vi-VN" | "en-US" {
  return (language ?? "en") === "vi" ? "vi-VN" : "en-US";
}

/** The active app locale, derived from i18n's resolved language. */
export function useAppLocale(): "vi-VN" | "en-US" {
  const { i18n } = useTranslation();
  return resolveLocale(i18n.resolvedLanguage ?? i18n.language);
}

/**
 * Date only, numeric year + 2-digit month/day (e.g. 09/31/2026). Empty →
 * em dash; unparseable → the raw input. Matches the former `useFormatDate` /
 * `useFormatDateTime` bodies in me-interviews, profile, interview-sessions-list.
 */
export function formatDate(
  iso: string | null | undefined,
  locale: string,
): string {
  if (!iso) return EM_DASH;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Short date + short time via Intl.DateTimeFormat (e.g. 9/31/26, 2:05 PM).
 * Empty → em dash. Matches the former admin/courses + organization-detail
 * `formatDate`/`useFormatDate` bodies.
 */
export function formatDateTime(
  iso: string | null | undefined,
  locale: string,
): string {
  if (!iso) return EM_DASH;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

/**
 * Medium date + time (e.g. Jul 31, 2026, 02:05 PM). Empty → em dash;
 * unparseable → raw input. Matches the former `fmtDateTime` in
 * assessment-tables. Locale-aware (the original hardcoded en-US; callers that
 * must stay en-US can pass "en-US").
 */
export function formatDateTimeMedium(
  iso: string | null | undefined,
  locale: string,
): string {
  if (!iso) return EM_DASH;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** `useFormatDate` — active-locale numeric date (see `formatDate`). */
export function useFormatDate() {
  const locale = useAppLocale();
  return (iso: string | null | undefined) => formatDate(iso, locale);
}

/** `useFormatDateTime` — active-locale short date + time (see `formatDateTime`). */
export function useFormatDateTime() {
  const locale = useAppLocale();
  return (iso: string | null | undefined) => formatDateTime(iso, locale);
}

/**
 * Relative day label ("today" / "yesterday" / "N days ago" / weeks / months),
 * i18n-driven. Empty → the caller-supplied "no activity" key. Matches the
 * former `useRelDate` in sr-cohort / sr-at-risk. Keys default to the
 * `teacher_sr_at_risk.*` namespace but can be overridden.
 */
export function useRelDate(keys?: {
  noActivity?: string;
  today?: string;
  yesterday?: string;
  daysAgo?: string;
  weeksAgo?: string;
  monthsAgo?: string;
}) {
  const { t } = useTranslation();
  const k = {
    noActivity: keys?.noActivity ?? "teacher_sr_at_risk.no_activity",
    today: keys?.today ?? "teacher_sr_at_risk.today",
    yesterday: keys?.yesterday ?? "teacher_sr_at_risk.yesterday",
    daysAgo: keys?.daysAgo ?? "teacher_sr_at_risk.days_ago",
    weeksAgo: keys?.weeksAgo ?? "teacher_sr_at_risk.weeks_ago",
    monthsAgo: keys?.monthsAgo ?? "teacher_sr_at_risk.months_ago",
  };
  return (iso: string | null | undefined) => {
    if (!iso) return t(k.noActivity);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    const days = Math.round((today.getTime() - d.getTime()) / 86_400_000);
    if (days <= 0) return t(k.today);
    if (days === 1) return t(k.yesterday);
    if (days < 7) return t(k.daysAgo, { count: days });
    if (days < 30) return t(k.weeksAgo, { count: Math.floor(days / 7) });
    return t(k.monthsAgo, { count: Math.floor(days / 30) });
  };
}

/**
 * `m:ss` clock. Pass `nullDash` to render `—` for null/undefined (the
 * course-quiz-review variant); otherwise a bare number is expected (the
 * quiz-session-helpers countdown variant). Minutes are not zero-padded.
 */
export function formatClock(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null) return EM_DASH;
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Seconds → `Xm Ys` (or `Ys` under a minute), or em dash when null. */
export function formatDurationShort(
  seconds: number | null | undefined,
): string {
  if (seconds == null || Number.isNaN(seconds)) return EM_DASH;
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/**
 * Elapsed label: `Hh MMm` when over an hour, else `Mm SSs`. Matches the former
 * `formatElapsedLabel` in course-interview.
 */
export function formatElapsedLabel(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}
