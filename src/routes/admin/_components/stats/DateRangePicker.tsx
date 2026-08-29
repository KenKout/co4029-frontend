import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  buildMonthGrid,
  daysBetweenInclusive,
  fromIso,
  presetKeyFor,
  rangePresets,
  toIso,
  type RangePresetKey,
  type RangeSelection,
} from "./date-range";

/** One calendar edge of the draft, null until picked. */
type Draft = { from: string | null; to: string | null };

const PRESET_KEYS: RangePresetKey[] = [
  "today",
  "yesterday",
  "last7",
  "last30",
  "thisMonth",
  "lastMonth",
];

/**
 * Custom time-range picker for the dashboard window (replaces the old
 * 1/7/30 segmented control).
 *
 * Trigger: pill showing the current selection ("Aug 1 – Aug 29, 2026") with
 * a calendar icon and a day-count badge. The panel keeps a DRAFT selection —
 * Apply commits it to the controller, Cancel / outside-click / trigger re-click
 * discard it and revert to the last applied range, so browsing presets and
 * days can never change the data mid-interaction.
 *
 * Calendar rule: the two visible months are (previous, current relative to
 * the draft's END); picking a preset or completing a selection jumps the
 * paging back to that anchor. First click sets the start, second sets the
 * end (auto-swapping when the second lands before the first), and a click
 * on a completed range starts a fresh one.
 */
export function DateRangePicker({
  range,
  onChange,
}: {
  range: RangeSelection;
  onChange: (next: RangeSelection) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({ from: null, to: null });
  const [monthOffset, setMonthOffset] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const todayIso = toIso(new Date());
  const presets = useMemo(() => rangePresets(new Date()), []);

  const openWithApplied = () => {
    setDraft({ from: range.from, to: range.to });
    setMonthOffset(0);
    setOpen(true);
  };
  const closeDiscarding = () => {
    setOpen(false);
    setMonthOffset(0);
  };

  // Click-outside closes and discards the draft.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) closeDiscarding();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // The two visible months anchor on the draft's END month.
  const anchor = draft.to
    ? fromIso(draft.to)
    : draft.from
      ? fromIso(draft.from)
      : fromIso(range.to);
  const anchorMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const leftMonth = new Date(
    anchorMonth.getFullYear(),
    anchorMonth.getMonth() - 1 + monthOffset,
    1,
  );
  const rightMonth = new Date(
    leftMonth.getFullYear(),
    leftMonth.getMonth() + 1,
    1,
  );
  const thisMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  );
  const maxOffset =
    (thisMonth.getFullYear() - anchorMonth.getFullYear()) * 12 +
    (thisMonth.getMonth() - anchorMonth.getMonth());

  const selectDay = (iso: string) => {
    if (!draft.from || (draft.from && draft.to)) {
      setDraft({ from: iso, to: null });
      return;
    }
    setDraft(
      iso < draft.from
        ? { from: iso, to: draft.from }
        : { from: draft.from, to: iso },
    );
    setMonthOffset(0);
  };
  const pickPreset = (key: RangePresetKey) => {
    setDraft(presets[key]);
    setMonthOffset(0);
  };
  const applyDraft = (next: Draft) => {
    if (!next.from || !next.to) return;
    onChange({ from: next.from, to: next.to });
    setOpen(false);
  };

  const activePreset = presetKeyFor(
    { from: draft.from ?? "", to: draft.to ?? "" },
    presets,
  );
  const draftDays =
    draft.from && draft.to ? daysBetweenInclusive(draft.from, draft.to) : null;

  return (
    <div ref={rootRef} className="relative">
      <Trigger
        range={range}
        open={open}
        onToggle={() => (open ? closeDiscarding() : openWithApplied())}
      />
      {open && (
        <Panel
          leftMonth={leftMonth}
          rightMonth={rightMonth}
          monthOffset={monthOffset}
          maxOffset={maxOffset}
          setMonthOffset={setMonthOffset}
          draft={draft}
          draftDays={draftDays}
          activePreset={activePreset}
          todayIso={todayIso}
          selectDay={selectDay}
          pickPreset={pickPreset}
          onCancel={closeDiscarding}
          onApply={() => applyDraft(draft)}
        />
      )}
    </div>
  );
}

/** The pill-shaped trigger: calendar icon + current range + day badge. */
function Trigger({
  range,
  open,
  onToggle,
}: {
  range: RangeSelection;
  open: boolean;
  onToggle: () => void;
}) {
  const { t, i18n } = useTranslation();
  const fmtShort = new Intl.DateTimeFormat(i18n.language, {
    month: "short",
    day: "numeric",
  });
  const fmtFull = new Intl.DateTimeFormat(i18n.language, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const days = daysBetweenInclusive(range.from, range.to);
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onToggle}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={t("admin.stats.range.trigger_aria")}
      className="h-auto rounded-full px-3 py-1.5 text-sm font-medium"
    >
      <CalendarIcon className="h-4 w-4 text-text-muted" aria-hidden />
      <span className="tabular-nums">
        {fmtShort.format(fromIso(range.from))}
        {" \u2013 "}
        {fmtFull.format(fromIso(range.to))}
      </span>
      <span className="rounded-full bg-surface-elev px-2 py-0.5 text-xs font-semibold text-text-muted tabular-nums">
        {days === 1
          ? t("admin.stats.range.days_one")
          : t("admin.stats.range.days_other", { count: days })}
      </span>
    </Button>
  );
}

/** Presets column + two-month calendar + footer. */
function Panel({
  leftMonth,
  rightMonth,
  monthOffset,
  maxOffset,
  setMonthOffset,
  draft,
  draftDays,
  activePreset,
  todayIso,
  selectDay,
  pickPreset,
  onCancel,
  onApply,
}: {
  leftMonth: Date;
  rightMonth: Date;
  monthOffset: number;
  maxOffset: number;
  setMonthOffset: (updater: (o: number) => number) => void;
  draft: Draft;
  draftDays: number | null;
  activePreset: RangePresetKey | null;
  todayIso: string;
  selectDay: (iso: string) => void;
  pickPreset: (key: RangePresetKey) => void;
  onCancel: () => void;
  onApply: () => void;
}) {
  const { t, i18n } = useTranslation();
  const fmtMonth = new Intl.DateTimeFormat(i18n.language, {
    month: "long",
    year: "numeric",
  });
  return (
    <div
      role="dialog"
      aria-label={t("admin.stats.range.panel_aria")}
      className="absolute right-0 z-20 mt-2 grid grid-cols-1 gap-0 overflow-hidden rounded-xl border border-border bg-white shadow-xl sm:grid-cols-[10rem_1fr]"
    >
      <div className="flex flex-col gap-0.5 border-b border-border p-2 sm:border-b-0 sm:border-r">
        {PRESET_KEYS.map((key) => {
          const active = activePreset === key;
          return (
            <Button
              key={key}
              type="button"
              variant="ghost"
              onClick={() => pickPreset(key)}
              className={`justify-start rounded-md px-3 text-sm ${
                active
                  ? "bg-m3-primary/10 font-semibold text-m3-primary"
                  : "font-normal"
              }`}
            >
              {t(`admin.stats.range.preset.${key}`)}
            </Button>
          );
        })}
      </div>

      <div className="min-w-[21rem] p-3">
        <div className="mb-2 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t("admin.stats.range.prev_month_aria")}
            onClick={() => setMonthOffset((o) => Math.max(o - 1, -240))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm font-semibold text-text-strong">
            {fmtMonth.format(leftMonth)}
            {" \u2013 "}
            {fmtMonth.format(rightMonth)}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t("admin.stats.range.next_month_aria")}
            disabled={monthOffset >= maxOffset}
            onClick={() =>
              setMonthOffset((o) => Math.min(o + 1, maxOffset))
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[leftMonth, rightMonth].map((month) => (
            <MonthGrid
              key={`${month.getFullYear()}-${month.getMonth()}`}
              month={month}
              draft={draft}
              todayIso={todayIso}
              onSelect={selectDay}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("admin.stats.range.cancel")}
          </Button>
          <Button
            type="button"
            variant="default"
            disabled={!draftDays}
            onClick={onApply}
          >
            {t("admin.stats.range.apply")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MonthGrid({
  month,
  draft,
  todayIso,
  onSelect,
}: {
  month: Date;
  draft: Draft;
  todayIso: string;
  onSelect: (iso: string) => void;
}) {
  const { i18n } = useTranslation();
  const grid = buildMonthGrid(month.getFullYear(), month.getMonth());
  const start = draft.from && draft.to ? draft.from : null;
  const end = draft.from && draft.to ? draft.to : null;
  const between = (iso: string) =>
    start !== null && end !== null && iso > start && iso < end;
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(i18n.language, { weekday: "short" }).format(
      new Date(2026, 8, 6 + i), // a known Sunday
    ),
  );
  const fmtMonth = new Intl.DateTimeFormat(i18n.language, {
    month: "short",
    year: "numeric",
  });
  return (
    <div>
      <p className="mb-1 text-center text-xs font-semibold text-text-muted">
        {fmtMonth.format(month)}
      </p>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] text-text-muted">
        {weekdays.map((w) => (
          <span key={w} className="py-0.5">
            {w}
          </span>
        ))}
        {grid.map((iso, i) => {
          if (!iso) return <span key={`pad-${i}`} />;
          const isStart = iso === start;
          const isEnd = iso === end;
          const isToday = iso === todayIso;
          const inFuture = iso > todayIso;
          const filled = isStart || isEnd || between(iso);
          const cellClass = isStart || isEnd
            ? "bg-m3-primary font-semibold text-white"
            : between(iso)
              ? "bg-m3-primary/15 font-semibold text-m3-primary"
              : "font-normal";
          return (
            <Button
              key={iso}
              type="button"
              variant="ghost"
              disabled={inFuture}
              aria-label={iso}
              aria-pressed={filled}
              onClick={() => onSelect(iso)}
              className={`relative size-7 rounded-full p-0 text-xs transition-colors duration-100 ${cellClass} ${
                inFuture ? "cursor-not-allowed text-text-muted/40" : ""
              } ${
                isToday && !isStart && !isEnd ? "ring-1 ring-m3-primary" : ""
              }`}
              title={iso}
            />
          );
        })}
      </div>
    </div>
  );
}