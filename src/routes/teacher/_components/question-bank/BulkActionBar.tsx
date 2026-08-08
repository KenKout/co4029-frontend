import { useTranslation } from "react-i18next";
import {
  BookMarked,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Target,
  Trash2,
  X,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUS_ORDER } from "./constants";
import { statusMeta } from "./helpers";
import type { OutcomeOption, ReviewStatus } from "./types";
import { Button } from "@/components/ui/button";

/**
 * Sticky contextual toolbar shown when one or more questions are selected.
 * Batches the per-question actions (set status, set outcome, add to bank,
 * delete) across the whole selection. All actions reuse the same mutations
 * as the single-question controls, so behaviour stays consistent.
 *
 * Extracted verbatim from the former 2.4k-line question-bank.tsx.
 */
export function BulkActionBar({
  count,
  busy,
  outcomeOptions,
  onSetStatus,
  onSetOutcome,
  onAddToBank,
  onDelete,
  onClear,
}: {
  count: number;
  busy: boolean;
  outcomeOptions: OutcomeOption[];
  onSetStatus: (s: ReviewStatus) => void;
  onSetOutcome: (o: string | null) => void;
  onAddToBank: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  return (
    // No `sticky` of its own: it is rendered inside the sticky toolbar, so it
    // inherits that stacking context and offset. Pinning it separately at the
    // same `top-32` with a higher z-index is what made it cover the search
    // field. The z-[5]/z-[6] pair it used to belong to is deliberately BELOW
    // the config screen's TabBar (z-10) — do not "normalise" those upward.
    <div className="flex items-center gap-2 flex-wrap rounded-xl border border-m3-primary/40 bg-primary-soft px-3 py-2 shadow-sm">
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-m3-primary">
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {t("teacher_interview_config.qbank.bulk.count", { count })}
      </span>

      {/* Set status */}
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md bg-white/70 px-2 py-1 text-xs font-semibold text-m3-on-surface hover:bg-white cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t("teacher_interview_config.qbank.bulk.set_status")}
          <ChevronDown className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          {STATUS_ORDER.map((s) => (
            <DropdownMenuItem
              key={s}
              onClick={() => onSetStatus(s)}
              className="gap-2"
            >
              {t(`teacher_interview_config.qbank.status.${statusMeta(s).key}`)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Set outcome */}
      {outcomeOptions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md bg-white/70 px-2 py-1 text-xs font-semibold text-m3-on-surface hover:bg-white cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Target className="h-3.5 w-3.5" />
            {t("teacher_interview_config.qbank.bulk.set_outcome")}
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-64 w-52 overflow-y-auto"
          >
            <DropdownMenuItem
              onClick={() => onSetOutcome(null)}
              className="gap-2"
            >
              {t("teacher_interview_config.qbank.no_outcome_option")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {outcomeOptions.map((o) => (
              <DropdownMenuItem
                key={o.id}
                onClick={() => onSetOutcome(o.id)}
                className="gap-2"
              >
                <span className="font-semibold shrink-0">{o.label}</span>
                <span className="truncate text-m3-on-surface-variant">
                  {o.text}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Add to bank */}
      <Button variant="ghost"
        type="button"
        disabled={busy}
        onClick={onAddToBank}
        className="inline-flex items-center gap-1 rounded-md bg-white/70 px-2 py-1 text-xs font-semibold text-m3-on-surface hover:bg-white cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <BookMarked className="h-3.5 w-3.5" />
        {t("teacher_interview_config.qbank.bulk.add_to_bank")}
      </Button>

      {/* Delete */}
      <Button variant="ghost"
        type="button"
        disabled={busy}
        onClick={onDelete}
        className="inline-flex items-center gap-1 rounded-md bg-white/70 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {t("common.delete")}
      </Button>

      {/* Clear selection */}
      <Button variant="ghost"
        type="button"
        onClick={onClear}
        className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-m3-on-surface-variant hover:text-m3-on-surface cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="h-3.5 w-3.5" />
        {t("teacher_interview_config.qbank.bulk.clear")}
      </Button>
    </div>
  );
}
