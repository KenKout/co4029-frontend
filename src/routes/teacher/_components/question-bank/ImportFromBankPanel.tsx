import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Library, Loader2, Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ImportPickerUnit } from "./use-question-bank-io";
import { cn } from "@/lib/utils";
import { difficultyChipClass } from "./helpers";

function ImportItemMeta({
  item,
}: {
  item: ImportPickerUnit["items"][number];
}) {
  const { t } = useTranslation();
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Badge variant="outline" className="text-[10px]">
        {t(`teacher_interview_config.qbank.type.${item.question_type}`)}
      </Badge>
      {item.difficulty && (
        <span
          className={cn(
            "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            difficultyChipClass(item.difficulty),
          )}
        >
          {t(`teacher_interview_config.qbank.difficulty.${item.difficulty}`)}
        </span>
      )}
    </span>
  );
}

function LogicalImportGroup({
  unit,
  selected,
  onToggle,
}: {
  unit: Extract<ImportPickerUnit, { kind: "logical" }>;
  selected: Set<string>;
  onToggle: (itemIds: string[]) => void;
}) {
  const { t } = useTranslation();
  const idPrefix = useId();
  const [activeId, setActiveId] = useState(unit.items[0]?.id ?? "");
  const active = unit.items.find((item) => item.id === activeId) ?? unit.items[0];
  if (!active) return null;
  const allSelected = unit.items.every((item) => selected.has(item.id));

  return (
    <li className="rounded-xl border border-m3-primary/25 bg-m3-surface-container-low p-2 sm:p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Library className="h-4 w-4 text-m3-primary" aria-hidden="true" />
          <h4 className="text-xs font-bold uppercase tracking-wide text-m3-primary">
            {t("teacher_interview_config.qbank.logical_question")}
          </h4>
          <span className="text-xs text-m3-on-surface-variant">
            {t("teacher_interview_config.qbank.angle_count", { count: unit.items.length })}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onToggle(unit.items.map((item) => item.id))}
          aria-pressed={allSelected}
          className="h-7 gap-1.5 px-2 text-[11px]"
        >
          <span
            className={cn(
              "flex h-3.5 w-3.5 items-center justify-center rounded border",
              allSelected
                ? "border-primary bg-primary text-white"
                : "border-m3-outline-variant",
            )}
          >
            {allSelected && <Check className="h-3 w-3" />}
          </span>
          {t("teacher_interview_config.qbank.import_logical_group")}
        </Button>
      </div>
      <div
        role="tablist"
        aria-label={t("teacher_interview_config.qbank.angle_tabs_label")}
        className="mb-2 flex flex-wrap gap-1 border-b border-m3-outline-variant/30 px-1"
      >
        {unit.items.map((item) => {
          const selectedTab = item.id === active.id;
          const tabId = `${idPrefix}-tab-${item.id}`;
          const panelId = `${idPrefix}-panel-${item.id}`;
          return (
            <Button
              key={item.id}
              id={tabId}
              type="button"
              variant="ghost"
              role="tab"
              aria-selected={selectedTab}
              aria-controls={panelId}
              tabIndex={selectedTab ? 0 : -1}
              onClick={() => setActiveId(item.id)}
              className={selectedTab
                ? "rounded-t-md border-b-2 border-m3-primary bg-m3-primary-fixed px-2.5 py-1.5 text-xs font-bold text-m3-primary"
                : "rounded-t-md px-2.5 py-1.5 text-xs font-medium text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary"}
            >
              {t(`teacher_interview_config.qbank.type.${item.question_type}`)}
            </Button>
          );
        })}
      </div>
      <div
        id={`${idPrefix}-panel-${active.id}`}
        role="tabpanel"
        aria-labelledby={`${idPrefix}-tab-${active.id}`}
        className="rounded-lg border border-m3-outline-variant/30 bg-m3-surface p-3"
      >
        <p className="text-sm leading-relaxed text-m3-on-surface">{active.prompt_text}</p>
        <div className="mt-2"><ImportItemMeta item={active} /></div>
      </div>
    </li>
  );
}

/** Import picker with logical groups selected as one atomic unit. */
export function ImportFromBankPanel({
  units,
  selected,
  onToggle,
  busy,
  onCancel,
  onConfirm,
}: {
  units: ImportPickerUnit[];
  selected: Set<string>;
  onToggle: (itemIds: string[]) => void;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const count = selected.size;
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Library className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
        <div className="space-y-0.5">
          <p className="text-sm font-bold text-m3-on-surface">
            {t("teacher_interview_config.qbank.import_title")}
          </p>
          <p className="text-xs text-m3-on-surface-variant max-w-prose">
            {t("teacher_interview_config.qbank.import_help")}
          </p>
        </div>
      </div>

      {units.length === 0 ? (
        <p className="rounded-lg border border-m3-outline-variant/30 bg-m3-surface px-3 py-2 text-xs text-m3-on-surface-variant">
          {t("teacher_interview_config.qbank.import_all_added")}
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-72 overflow-y-auto">
          {units.map((unit) => {
            if (unit.kind === "logical") {
              return <LogicalImportGroup key={unit.key} unit={unit} selected={selected} onToggle={onToggle} />;
            }
            const item = unit.items[0];
            const isSelected = selected.has(item.id);
            return (
              <li key={unit.key}>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => onToggle([item.id])}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors h-auto whitespace-normal",
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-m3-outline-variant/30 bg-m3-surface hover:bg-m3-surface-container-low",
                  )}
                >
                  <span className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                    isSelected ? "border-primary bg-primary text-white" : "border-m3-outline-variant",
                  )}>
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block text-sm text-m3-on-surface leading-relaxed">{item.prompt_text}</span>
                    <ImportItemMeta item={item} />
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onCancel}>
          <X className="h-4 w-4" />
          {t("common.cancel")}
        </Button>
        <Button type="button" size="sm" className="gap-1.5" disabled={busy || count === 0} onClick={onConfirm}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t("teacher_interview_config.qbank.import_selected", { count })}
        </Button>
      </div>
    </div>
  );
}
