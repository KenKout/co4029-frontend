import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { DateRangeCalendar, type DateRangeDraft } from "./DateRangeCalendar";
import {
  daysBetweenInclusive,
  fromIso,
  type RangeSelection,
} from "./date-range";

/**
 * Custom time-range picker for the dashboard window (replaces the old
 * 1/7/30 segmented control).
 *
 * Trigger: pill showing the current selection ("Aug 1 – Aug 29, 2026") with
 * a calendar icon and a day-count badge. The panel (shared DateRangeCalendar)
 * keeps a DRAFT selection — Apply commits it to the controller, Cancel /
 * outside-click / trigger re-click discard it and revert to the last applied
 * range, so browsing presets and days can never change the data mid-flow.
 */
export function DateRangePicker({
  range,
  onChange,
}: {
  range: RangeSelection;
  onChange: (next: RangeSelection) => void;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRangeDraft>({ from: null, to: null });
  const rootRef = useRef<HTMLDivElement>(null);

  const openWithApplied = () => {
    setDraft({ from: range.from, to: range.to });
    setOpen(true);
  };
  const closeDiscarding = () => setOpen(false);
  const applyDraft = (next: DateRangeDraft) => {
    if (!next.from || !next.to) return;
    onChange({ from: next.from, to: next.to });
    setOpen(false);
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

  const days = daysBetweenInclusive(range.from, range.to);
  const fmtShort = new Intl.DateTimeFormat(i18n.language, {
    month: "short",
    day: "numeric",
  });
  const fmtFull = new Intl.DateTimeFormat(i18n.language, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={() => (open ? closeDiscarding() : openWithApplied())}
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

      {open && (
        <div
          role="dialog"
          aria-label={t("admin.stats.range.panel_aria")}
          className="absolute right-0 z-20 mt-2 overflow-hidden rounded-xl border border-border bg-white shadow-xl"
        >
          {/* key remounts paging on every open */}
          <DateRangeCalendar
            key={open ? "open" : "closed"}
            draft={draft}
            onDraftChange={setDraft}
            anchorTo={range.to}
            onApply={() => applyDraft(draft)}
            onCancel={closeDiscarding}
          />
        </div>
      )}
    </div>
  );
}