import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  buildMonthGrid,
  fromIso,
  presetKeyFor,
  rangePresets,
  toIso,
  type RangePresetKey,
} from "./date-range";

/** Draft selection inside a range picker — both ends optional while picking. */
export type DateRangeDraft = { from: string | null; to: string | null };

const PRESET_KEYS: RangePresetKey[] = [
  "today",
  "yesterday",
  "last7",
  "last30",
  "thisMonth",
  "lastMonth",
];

const WEEKDAY_KEYS = ["wd_0", "wd_1", "wd_2", "wd_3", "wd_4", "wd_5", "wd_6"];

/** Anchor month for a calendar column, given the draft + applied range. */
function columnAnchor(
  side: "from" | "to",
  draft: DateRangeDraft,
  anchorTo?: string,
): Date {
  if (side === "from") {
    const d = draft.from
      ? fromIso(draft.from)
      : draft.to
        ? addMonths(fromIso(draft.to), -1)
        : anchorTo
          ? fromIso(anchorTo)
          : new Date();
    return d;
  }
  const d = draft.to
    ? fromIso(draft.to)
    : draft.from
      ? addMonths(fromIso(draft.from), 1)
      : anchorTo
        ? fromIso(anchorTo)
        : new Date();
  return d;
}

function addMonths(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setMonth(d.getMonth() + delta);
  return d;
}

function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** ``MM/yyyy`` — language-independent, per the range-label convention. */
function fmtMonth(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export function DateRangeCalendar({
  draft,
  onDraftChange,
  anchorTo,
  applyLabel,
  cancelLabel,
  applyDisabled = false,
  footerLeading,
  onApply,
  onCancel,
}: {
  draft: DateRangeDraft;
  onDraftChange: (next: DateRangeDraft) => void;
  /** Applied range end — anchor when the draft is empty (outside click target). */
  anchorTo?: string;
  applyLabel?: string;
  cancelLabel?: string;
  applyDisabled?: boolean;
  /** Extra footer content before Cancel (e.g. the dialog's Clear button). */
  footerLeading?: ReactNode;
  onApply: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  const today = new Date();
  const todayIso = toIso(today);
  const presets = useMemo(() => rangePresets(new Date()), []);

  const anchor = draft.to ?? draft.from ?? anchorTo ?? todayIso;

  /** Each column pages independently (left = from, right = to). Initialized
   * once at mount; only a preset click rewrites them. */
  const [leftView, setLeftView] = useState(() =>
    startOfMonth(columnAnchor("from", draft, anchor)),
  );
  const [rightView, setRightView] = useState(() =>
    startOfMonth(columnAnchor("to", draft, anchor)),
  );

  const activePreset = presetKeyFor(
    { from: draft.from ?? "", to: draft.to ?? "" },
    presets,
  );

  /** Left column = the FROM end. Clicking only ever moves/clears ``from``… */
  const pickFrom = (iso: string) =>
    onDraftChange({ ...draft, from: draft.from === iso ? null : iso });
  /** …and the right column = the TO end. No swapping, no month jumping. */
  const pickTo = (iso: string) =>
    onDraftChange({ ...draft, to: draft.to === iso ? null : iso });

  const pickPreset = (key: RangePresetKey) => {
    const preset = presets[key];
    onDraftChange({ ...preset });
    setLeftView(startOfMonth(fromIso(preset.from)));
    setRightView(startOfMonth(fromIso(preset.to)));
  };

  return (
    /* Width is load-bearing, not cosmetic. Two MonthColumns are min-w-[15rem]
       each and grid items do not shrink below their content (min-width:auto),
       so a container narrower than 10rem + 15rem + 15rem + gap + padding does
       not compress the calendars — it overflows them into each other, and the
       popover's overflow-hidden then clips the result into an unreadable
       overlap. 43rem is that sum with a little slack; max-w keeps the panel
       inside a narrow viewport rather than pushing the page sideways. */
    <div className="grid min-w-[21rem] max-w-[calc(100vw-2rem)] grid-cols-1 gap-0 sm:min-w-[43rem] sm:grid-cols-[10rem_1fr]">
      <PresetList activePreset={activePreset} onPick={pickPreset} />

      {/* min-w-0 so this track can never silently force the grid wider than
          its container the way the calendars just did. */}
      <div className="min-w-0 p-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MonthColumn
            side="from"
            label={t("admin.stats.range.from")}
            view={leftView}
            onViewChange={setLeftView}
            draft={draft}
            onPick={pickFrom}
            todayIso={todayIso}
            maxIso={draft.to ?? todayIso}
          />
          <MonthColumn
            side="to"
            label={t("admin.stats.range.to")}
            view={rightView}
            onViewChange={setRightView}
            draft={draft}
            onPick={pickTo}
            todayIso={todayIso}
            minIso={draft.from ?? undefined}
            maxIso={todayIso}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
          <div className="flex items-center gap-1">{footerLeading}</div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              {cancelLabel ?? t("common.cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onApply}
              disabled={applyDisabled || !draft.from}
            >
              {applyLabel ?? t("common.apply")}
            </Button>
          </div>
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
      {PRESET_KEYS.map((key) => (
        <Button
          key={key}
          type="button"
          variant={activePreset === key ? "default" : "ghost"}
          size="sm"
          onClick={() => onPick(key)}
          className="justify-start"
        >
          {t(`admin.stats.range.preset_${key}`)}
        </Button>
      ))}
    </div>
  );
}

/** Half-pill cap for a day cell: FROM rounds its leading edge, TO its
 * trailing edge; a single-day range is a full pill. */
function halfPillCap(
  side: "from" | "to",
  iso: string,
  draft: DateRangeDraft,
): string {
  if (side === "from") {
    return iso !== draft.to ? "rounded-l-full rounded-r-none" : "rounded-full";
  }
  return iso !== draft.from ? "rounded-r-full rounded-l-none" : "rounded-full";
}

/** Base chip: solid for the picked end, soft band between, quiet otherwise. */
function chipClass(
  isSel: boolean,
  isMid: boolean,
  isD: boolean,
  off: boolean,
): string {
  if (isSel) return "bg-m3-primary font-semibold text-white";
  if (isMid) return "bg-m3-primary/15 text-m3-primary";
  if (isD || off) return "text-m3-on-surface-variant/60";
  return "text-m3-on-surface hover:bg-m3-primary/10";
}

/** One calendar column with its OWN month+year navigation. */
function MonthColumn({
  side,
  label,
  view,
  onViewChange,
  draft,
  onPick,
  todayIso,
  maxIso,
  minIso,
}: {
  side: "from" | "to";
  label: string;
  view: Date;
  onViewChange: (d: Date) => void;
  draft: DateRangeDraft;
  onPick: (iso: string) => void;
  todayIso: string;
  /** Hard ceiling: dates after this are disabled (to, or today). */
  maxIso?: string;
  /** Hard floor: dates before this are disabled (from, on the to side). */
  minIso?: string;
}) {
  const { t } = useTranslation();
  const cells = useMemo(
    () => buildMonthGrid(view.getFullYear(), view.getMonth()),
    [view],
  );

  const selected = side === "from" ? draft.from : draft.to;

  const isSelected = (iso: string) => selected === iso;
  const isToday = (iso: string) => iso === todayIso;
  const disabled = (iso: string) => {
    if (maxIso && iso > maxIso) return true;
    if (minIso && iso < minIso) return true;
    return false;
  };
  /** Days strictly between the two picked ends get a soft band. */
  const between = (iso: string) =>
    Boolean(draft.from && draft.to && iso > draft.from && iso < draft.to);
  const outOfMonth = (iso: string) => iso.slice(0, 7) !== fmtMonth(view);

  return (
    <div className="min-w-[15rem]">
      <div className="mb-1 flex items-center justify-between gap-1">
        <MonthYearSelect
          view={view}
          onViewChange={onViewChange}
          ariaLabel={label}
        />
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`${label} ${t("admin.stats.range.prev_month_aria")}`}
            onClick={() => onViewChange(addMonths(view, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`${label} ${t("admin.stats.range.next_month_aria")}`}
            onClick={() => onViewChange(addMonths(view, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAY_KEYS.map((key) => (
          <div
            key={key}
            className="pb-1 text-[11px] font-medium uppercase tracking-wide text-m3-on-surface-variant"
          >
            {t(`admin.stats.range.${key}`)}
          </div>
        ))}
        {cells.map((iso) => {
          if (!iso) {
            return (
              <div
                key={`blank-${cells.indexOf(iso)}`}
                className="aspect-square"
              />
            );
          }
          const off = outOfMonth(iso);
          const isSel = isSelected(iso);
          const isMid = between(iso);
          const isD = disabled(iso);
          const cap = isSel ? halfPillCap(side, iso, draft) : undefined;
          return (
            <Button
              key={iso}
              type="button"
              variant="ghost"
              disabled={isD}
              aria-label={`${iso}${isSel ? ` (${t("admin.stats.range.selected")})` : ""}`}
              onClick={() => onPick(iso)}
              className={`relative h-auto w-full aspect-square rounded-none p-0 text-xs ${cap ?? ""} ${chipClass(
                isSel,
                isMid,
                isD,
                off,
              )} ${
                isToday(iso) && !isSel && !isMid
                  ? "ring-1 ring-inset ring-m3-primary"
                  : ""
              }`}
            >
              {Number(iso.slice(8, 10))}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

/** Per-column month + year selector: chevrons page months, the label opens a
 * 12-month grid with year paging, so July→December needs two clicks max. */
function MonthYearSelect({
  view,
  onViewChange,
  ariaLabel,
}: {
  view: Date;
  onViewChange: (d: Date) => void;
  ariaLabel: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pickYear, setPickYear] = useState(view.getFullYear());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const pickMonth = (month: number) => {
    onViewChange(new Date(pickYear, month, 1));
    setOpen(false);
  };

  return (
    <div className="relative" ref={rootRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={ariaLabel}
        className="gap-1 px-2 font-semibold"
        onClick={() => {
          setPickYear(view.getFullYear());
          setOpen((o) => !o);
        }}
      >
        <CalendarIcon className="h-3.5 w-3.5 text-m3-on-surface-variant" />
        {fmtMonth(view)}
        <ChevronDown className="h-3.5 w-3.5 text-m3-on-surface-variant" />
      </Button>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 w-52 rounded-lg border border-m3-outline-variant/40 bg-white p-2 shadow-xl">
          <div className="mb-1 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`${t("admin.stats.range.prev_year_aria")} ${pickYear - 1}`}
              onClick={() => setPickYear((y) => y - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-sm font-semibold tabular-nums">
              {pickYear}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`${t("admin.stats.range.next_year_aria")} ${pickYear + 1}`}
              onClick={() => setPickYear((y) => y + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 12 }, (_, m) => {
              const isCurrent =
                view.getFullYear() === pickYear && view.getMonth() === m;
              return (
                <Button
                  key={m}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="justify-center px-0 text-xs"
                  onClick={() => pickMonth(m)}
                >
                  <span
                    className={
                      isCurrent ? "font-semibold text-m3-primary" : undefined
                    }
                  >
                    {t(`admin.stats.range.month_${m}`)}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
