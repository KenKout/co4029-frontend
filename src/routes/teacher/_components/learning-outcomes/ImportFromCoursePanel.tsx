import { useTranslation } from "react-i18next";
import { BookOpen, Check, Loader2, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CourseLearningOutcomeAuthoring } from "@/lib/api/types";
import { cn } from "@/lib/utils";

function ImportOutcomeRow({
  outcome,
  index,
  selected,
  onToggle,
}: {
  outcome: CourseLearningOutcomeAuthoring;
  index: number;
  selected: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  return (
    <li>
      <Button variant="ghost"
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className={cn(
          "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
          selected
            ? "border-primary bg-primary/10"
            : "border-m3-outline-variant/30 bg-m3-surface hover:bg-m3-surface-container-low",
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
            selected
              ? "border-primary bg-primary text-white"
              : "border-m3-outline-variant",
          )}
        >
          {selected && <Check className="h-3 w-3" />}
        </span>
        <span className="min-w-0 flex-1 space-y-0.5">
          <span className="inline-flex items-center rounded-full bg-m3-primary-fixed px-1.5 py-0.5 text-[10px] font-extrabold text-m3-primary mr-1.5">
            {t("teacher_interview_config.outcomes.course_lo_code", {
              n: outcome.position ?? index + 1,
            })}
          </span>
          <span className="text-sm text-m3-on-surface leading-relaxed">
            {outcome.outcome_text}
          </span>
        </span>
      </Button>
    </li>
  );
}

export function ImportFromCoursePanel({
  outcomes,
  selected,
  onToggle,
  busy,
  onCancel,
  onConfirm,
}: {
  outcomes: CourseLearningOutcomeAuthoring[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const count = selected.size;
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <BookOpen
          className="h-4 w-4 text-primary mt-0.5 shrink-0"
          aria-hidden="true"
        />
        <div className="space-y-0.5">
          <p className="text-sm font-bold text-m3-on-surface">
            {t("teacher_interview_config.outcomes.import_title")}
          </p>
          <p className="text-xs text-m3-on-surface-variant max-w-prose">
            {t("teacher_interview_config.outcomes.import_help")}
          </p>
        </div>
      </div>

      {outcomes.length === 0 && (
        <p className="rounded-lg border border-m3-outline-variant/30 bg-m3-surface px-3 py-2 text-xs text-m3-on-surface-variant">
          {t("teacher_interview_config.outcomes.import_all_added")}
        </p>
      )}

      <ul className="space-y-1.5 max-h-64 overflow-y-auto">
        {outcomes.map((co, idx) => (
          <ImportOutcomeRow
            key={co.id}
            outcome={co}
            index={idx}
            selected={selected.has(co.id)}
            onToggle={() => onToggle(co.id)}
          />
        ))}
      </ul>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          disabled={busy || count === 0}
          onClick={onConfirm}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {t("teacher_interview_config.outcomes.import_selected", { count })}
        </Button>
      </div>
    </div>
  );
}
