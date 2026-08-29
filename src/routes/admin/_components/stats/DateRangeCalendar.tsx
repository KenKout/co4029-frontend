import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  buildMonthGrid,
  fromIso,
  presetKeyFor,
  rangePresets,
  toIso,
  type RangePresetKey,
} from "./date-range";

/** One calendar edge of the selection, null until picked. */
export type DateRangeDraft = { from: string | null; to: string | null };

const PRESET_KEYS: RangePresetKey[] = [
  "today",
  "yesterday",
  "last7",
  "last30",
  "thisMonth",
  "lastMonth",
];

/**
 * Shared selection UI for a custom date range: presets column + two-month
 * calendar + footer. Used by the stats dashboard picker (dropdown) and the
 * data-table toolbar's custom-range dialog, so both surfaces behave the same.
 *
 * Contract: the DRAFT is controlled by the parent (Apply/Cancel decide what
 * happens to it); paging is internal and fresh per mount. First click sets
 * the start, second sets the end (auto-swapping when the second lands before
 * the first); a click on a completed range starts a fresh one.
 *
 * Calendar rules (shared spec):
 * - two months side by side, (previous, current) relative to the draft end;
 *   preset clicks jump the paging back to that anchor;
 * - weekday headers are compact per language (S M T W Th F Sa / CN T2…T7);
 * - the range renders as a CONTINUOUS bar of squares with half-pill ends
 *   (rounded on the outer edge of start/end only), matching the way range
 *   highlights are drawn elsewhere;
 * - the header shows the months as MM/yyyy (language-independent).
 */
export function DateRangeCalendar({
  draft,
  onDraftChange,
  anchorTo,
  applyDisabled = false,
  applyLabel,
  cancelLabel,
  footerLeading,
  onApply,
  onCancel,
}: {
  draft: DateRangeDraft;
  onDraftChange: (next: DateRangeDraft) => void;
  /** Fallback end date (ISO) when the draft has no anchor yet. */
  anchorTo: string;
  applyDisabled?: boolean;
  applyLabel?: string;
  cancelLabel?: string;
  /** Extra footer content before Cancel (e.g. the dialog's Clear button). */
  footerLeading?: ReactNode;
  onApply: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [monthOffset, setMonthOffset] = useState(0);
  const presets = useMemo(() => rangePresets(new Date()), []);

  const todayIso = toIso(new Date());
  const anchor = draft.to
    ? fromIso(draft.to)
    : draft.from
      ? fromIso(draft.from)
      : fromIso(anchorTo);
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
      onDraftChange({ from: iso, to: null });
      return;
    }
    onDraftChange(
      iso < draft.from
        ? { from: iso, to: draft.from }
        : { from: draft.from, to: iso },
    );
    setMonthOffset(0);
  };
  const pickPreset = (key: RangePresetKey) => {
    onDraftChange(presets[key]);
    setMonthOffset(0);
  };

  const activePreset = presetKeyFor(
    { from: draft.from ?? "", to: draft.to ?? "" },
    presets,
  );

  const fmtMonth = (m: Date) =>
    `${String(m.getMonth() + 1).padStart(2, "0")}/${m.getFullYear()}`;
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    t(`admin.stats.range.wd_${i}`),
  );
  const start = draft.from && draft.to ? draft.from : null;
  const end = draft.from && draft.to ? draft.to : null;

  return (
    <div className="grid min-w-[21rem] grid-cols-1 gap-0 sm:min-w-[36rem] sm:grid-cols-[10rem_1fr]">
      <PresetList
        activePreset={activePreset}
        onPick={pickPreset}
      />

      <div className="p-3">
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
          <p className="text-sm font-semibold text-text-strong tabular-nums">
            {fmtMonth(leftMonth)}
            {" \u2013 "}
            {fmtMonth(rightMonth)}
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[leftMonth, rightMonth].map((month) => (
            <MonthGrid
              key={`${month.getFullYear()}-${month.getMonth()}`}
              month={month}
              weekdays={weekdays}
              start={start}
              end={end}
              todayIso={todayIso}
              onSelect={selectDay}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3">
          {footerLeading}
          <span className="flex-1" />
          <Button type="button" variant="ghost" onClick={onCancel}>
            {cancelLabel ?? t("admin.stats.range.cancel")}
          </Button>
          <Button
            type="button"
            variant="default"
            disabled={applyDisabled || !draft.from}
            onClick={onApply}
          >
            {applyLabel ?? t("admin.stats.range.apply")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Left column: one-click preset ranges, active one highlighted. */
function PresetList({
  activePreset,
  onPick,
}: {
  activePreset: RangePresetKey | null;
  onPick: (key: RangePresetKey) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-0.5 border-b border-border p-2 sm:border-b-0 sm:border-r">
      {PRESET_KEYS.map((key) => {
        const active = activePreset === key;
        return (
          <Button
            key={key}
            type="button"
            variant="ghost"
            onClick={() => onPick(key)}
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
  );
}

/**
 * One month: compact weekday header + Sunday-first day grid. The range is a
 * continuous bar: start/end are solid squares with the OUTER corner rounded
 * (half-pill ends); in-between days are a flat soft fill.
 */
function MonthGrid({
  month,
  weekdays,
  start,
  end,
  todayIso,
  onSelect,
}: {
  month: Date;
  weekdays: string[];
  start: string | null;
  end: string | null;
  todayIso: string;
  onSelect: (iso: string) => void;
}) {
  const grid = buildMonthGrid(month.getFullYear(), month.getMonth());
  const between = (iso: string) =>
    start !== null && end !== null && iso > start && iso < end;
  return (
    <div>
      <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-medium uppercase tracking-wide text-text-muted">
        {weekdays.map((w) => (
          <span key={w} className="py-0.5">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {grid.map((iso, i) => {
          if (!iso) return <span key={`pad-${i}`} />;
          const isStart = iso === start;
          const isEnd = iso === end;
          const isToday = iso === todayIso;
          const inFuture = iso > todayIso;
          const filled = isStart || isEnd || between(iso);
          const singleDay = isStart && isEnd;
          // End-cap rounding: start rounds its LEFT edge, end its RIGHT edge,
          // a single-day range is a full pill, middle days stay square.
          const cap =
            singleDay
              ? "rounded-full"
              : isStart
                ? "rounded-l-full"
                : isEnd
                  ? "rounded-r-full"
                  : "";
          const chip = isStart || isEnd
            ? "bg-m3-primary text-white font-semibold"
            : between(iso)
              ? "bg-m3-primary/15 text-m3-primary font-semibold"
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
              className={`relative h-auto w-full aspect-square rounded-none p-0 text-xs transition-colors duration-100 ${cap} ${chip} ${
                inFuture ? "cursor-not-allowed text-text-muted/40" : ""
              } ${
                isToday && !filled ? "ring-1 ring-m3-primary" : ""
              }`}
              title={iso}
            >
              {Number(iso.slice(8, 10))}
            </Button>
          );
        })}
      </div>
    </div>
  );
}