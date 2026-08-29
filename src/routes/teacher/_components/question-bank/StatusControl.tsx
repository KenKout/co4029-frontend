import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Loader2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { STATUS_ORDER } from "./constants";
import { statusMeta } from "./helpers";
import type { ReviewStatus } from "./types";

/**
 * Unified status control (dropdown; icon + text, not colour alone). Extracted
 * verbatim from the former 2.4k-line question-bank.tsx.
 */
export function StatusControl({
  status,
  saving,
  disabled,
  onSetStatus,
}: {
  status: ReviewStatus;
  saving: boolean;
  disabled?: boolean;
  onSetStatus: (s: ReviewStatus) => void;
}) {
  const { t } = useTranslation();
  const meta = statusMeta(status);
  const Icon = meta.Icon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={saving || disabled}
        aria-label={t("teacher_interview_config.qbank.status_control_label", {
          status: t(`teacher_interview_config.qbank.status.${meta.key}`),
        })}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wide cursor-pointer transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          meta.chipClass,
          saving && "opacity-60",
        )}
      >
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        ) : (
          <Icon className="h-3 w-3" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">
          {t(`teacher_interview_config.qbank.status.${meta.key}`)}
        </span>
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {STATUS_ORDER.map((s) => {
          const m = statusMeta(s);
          const MIcon = m.Icon;
          return (
            <DropdownMenuItem
              key={s}
              onClick={() => onSetStatus(s)}
              className="gap-2"
            >
              <MIcon className={cn("h-4 w-4", m.dotClass)} aria-hidden="true" />
              <span className={cn(s === status && "font-bold")}>
                {t(`teacher_interview_config.qbank.status.${m.key}`)}
              </span>
              {s === status && <Check className="h-3.5 w-3.5 ml-auto" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
