import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronDown,
  Loader2,
  Target,
  TriangleAlert,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { OutcomeOption } from "./types";

/**
 * Inline learning-outcome control (dropdown; assign / change / clear).
 *
 * Shows the currently-assigned outcome (LO label) right on the card and lets
 * the teacher reassign it without opening the full edit form. Patches
 * linked_outcome_id immediately (with toast + undo, handled by the parent).
 *
 * Extracted verbatim from the former 2.4k-line question-bank.tsx.
 */
export function OutcomeControl({
  value,
  options,
  saving,
  onSetOutcome,
}: {
  value: string | null;
  options: OutcomeOption[];
  saving: boolean;
  onSetOutcome: (o: string | null) => void;
}) {
  const { t } = useTranslation();
  const current = value ? options.find((o) => o.id === value) : undefined;
  const assigned = Boolean(current);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={saving || options.length === 0}
        aria-label={t("teacher_interview_config.qbank.outcome_control_label", {
          outcome: current
            ? current.label
            : t("teacher_interview_config.qbank.no_outcome_option"),
        })}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60",
          assigned
            ? "text-m3-primary hover:bg-primary/10"
            : "text-amber-700 hover:bg-amber-50",
        )}
      >
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        ) : assigned ? (
          <Target className="h-3 w-3" aria-hidden="true" />
        ) : (
          <TriangleAlert className="h-3 w-3" aria-hidden="true" />
        )}
        {assigned
          ? current!.label
          : t("teacher_interview_config.qbank.no_outcome_short")}
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-72 max-w-[calc(100vw-2rem)]"
      >
        <DropdownMenuItem onClick={() => onSetOutcome(null)} className="gap-2">
          <span className={cn("truncate", !value && "font-bold")}>
            {t("teacher_interview_config.qbank.no_outcome_option")}
          </span>
          {!value && <Check className="h-3.5 w-3.5 ml-auto shrink-0" />}
        </DropdownMenuItem>
        {options.length > 0 && <DropdownMenuSeparator />}
        {options.map((o) => (
          <DropdownMenuItem
            key={o.id}
            onClick={() => onSetOutcome(o.id)}
            className="gap-2"
          >
            <span className="font-semibold text-m3-primary shrink-0">
              {o.label}
            </span>
            <span className={cn("truncate", o.id === value && "font-bold")}>
              {o.text}
            </span>
            {o.id === value && (
              <Check className="h-3.5 w-3.5 ml-auto shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
