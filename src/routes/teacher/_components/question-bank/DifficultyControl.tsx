import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Gauge, Loader2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { difficultyChipClass } from "./helpers";
import type { QuestionDifficulty } from "./types";

/**
 * Inline difficulty control (dropdown) for a question card.
 *
 * Difficulty is the one generated property a teacher routinely re-judges per
 * question — the generator's label is a guess, the cohort is real. Same
 * contract as the outcome control: the current level renders on the card in
 * its chip colour, picking another PATCHes immediately (toast + undo are the
 * parent's job). Falls back to a neutral "—" chip when the question has no
 * difficulty yet, so AI-generated rows without one are still settable here.
 *
 * Extracted as a sibling of OutcomeControl/StatusControl rather than folded
 * into the edit form: a re-grade is one click on the triage list, not an
 * editing session.
 */

const DIFFICULTY_ORDER: QuestionDifficulty[] = [
  "junior",
  "mid_level",
  "senior",
];

export function DifficultyControl({
  value,
  saving,
  disabled,
  onSetDifficulty,
}: {
  value: QuestionDifficulty | null;
  saving: boolean;
  disabled?: boolean;
  onSetDifficulty: (d: QuestionDifficulty) => void;
}) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={saving || disabled}
        aria-label={t(
          "teacher_interview_config.qbank.difficulty_control_label",
          {
            difficulty: value
              ? t(`teacher_interview_config.difficulty.${value}`)
              : t("teacher_interview_config.qbank.difficulty_missing"),
          },
        )}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60",
          value
            ? difficultyChipClass(value)
            : "bg-m3-surface-variant/60 text-m3-on-surface-variant",
          saving && "opacity-60",
        )}
      >
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        ) : (
          <Gauge className="h-3 w-3" aria-hidden="true" />
        )}
        {value
          ? t(`teacher_interview_config.difficulty.${value}`)
          : t("teacher_interview_config.qbank.difficulty_missing")}
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {DIFFICULTY_ORDER.map((d) => (
          <DropdownMenuItem
            key={d}
            onClick={() => onSetDifficulty(d)}
            className="gap-2"
          >
            <span
              className={cn(
                "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
                difficultyChipClass(d),
              )}
              aria-hidden="true"
            />
            <span className={cn("truncate", d === value && "font-bold")}>
              {t(`teacher_interview_config.difficulty.${d}`)}
            </span>
            {d === value && <Check className="h-3.5 w-3.5 ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
