import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/**
 * Shape every selectable entity must expose so the dialog can render,
 * key, and dedupe rows without knowing the concrete entity type.
 */
export interface SelectableEntity {
  /** Stable identifier used as the selection key + React key. */
  id: string;
  /** Primary line (course title, student display name / email). */
  primaryLabel: string;
  /** Secondary muted line (slug, email) — optional. */
  secondaryLabel?: string | null;
}

interface EntityMultiSelectDialogProps<T extends SelectableEntity> {
  title: string;
  /** Placeholder for the search input. */
  searchPlaceholder: string;
  /** Candidate rows to show (already fetched by the caller). */
  items: T[];
  /** IDs already attached to the parent — rendered disabled + checked. */
  alreadySelectedIds: Set<string>;
  /** Loading state for the candidate list. */
  isLoading: boolean;
  /** Current search text (controlled by caller so it can drive server queries). */
  query: string;
  onQueryChange: (value: string) => void;
  /** Called with the chosen entities when the user confirms. */
  onConfirm: (selected: T[]) => void;
  onClose: () => void;
  /** True while the batch add mutations are in flight. */
  isSubmitting?: boolean;
  /** Optional extra controls rendered under the search box (filters, load-more). */
  footerSlot?: ReactNode;
  /** Empty-state text when there are no candidates. */
  emptyText: string;
  /** Label suffix shown on already-attached rows, e.g. "Added". */
  alreadyAddedLabel: string;
}

/**
 * Generic search + checkbox multi-select dialog.
 *
 * Entity-agnostic: the caller fetches candidates (course catalogue,
 * user search, …), maps them to {@link SelectableEntity}, and handles the
 * actual add mutations in `onConfirm`. Rows already attached to the parent
 * are shown checked + disabled so the manager sees current state without a
 * separate lookup. Selection state is local; confirming hands back the full
 * list of newly-picked entities so the caller can loop the single-item add
 * endpoint (the backend has no bulk-add route).
 */
export function EntityMultiSelectDialog<T extends SelectableEntity>({
  title,
  searchPlaceholder,
  items,
  alreadySelectedIds,
  isLoading,
  query,
  onQueryChange,
  onConfirm,
  onClose,
  isSubmitting = false,
  footerSlot,
  emptyText,
  alreadyAddedLabel,
}: EntityMultiSelectDialogProps<T>) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<Map<string, T>>(new Map());

  // Close on Escape for keyboard users.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, isSubmitting]);

  const selectableItems = useMemo(
    () => items.filter((it) => !alreadySelectedIds.has(it.id)),
    [items, alreadySelectedIds],
  );

  function toggle(item: T) {
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.set(item.id, item);
      }
      return next;
    });
  }

  const pickedCount = picked.size;

  function handleConfirm() {
    if (pickedCount === 0) return;
    onConfirm([...picked.values()]);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-popover rounded-xl shadow-lg flex flex-col max-h-[80vh]"
      >
        <div className="flex items-center justify-between gap-3 p-5 border-b border-m3-outline-variant/20">
          <h2 className="text-lg font-headline font-bold text-m3-on-surface">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-m3-on-surface-variant hover:text-m3-on-surface disabled:opacity-40 cursor-pointer"
            aria-label={t("common.cancel")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 pb-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-on-surface-variant pointer-events-none" />
            <Input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-10"
              autoFocus
            />
          </div>
          {footerSlot}
        </div>

        <div className="flex-1 overflow-auto px-2 min-h-[8rem]">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-m3-surface-container animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="p-6 text-center text-sm text-m3-on-surface-variant">
              {emptyText}
            </p>
          ) : (
            <ul className="py-1">
              {/* Already-attached rows: checked + disabled, shown first. */}
              {items
                .filter((it) => alreadySelectedIds.has(it.id))
                .map((it) => (
                  <li key={it.id}>
                    <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg opacity-60">
                      <Checkbox checked disabled />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-m3-on-surface truncate">
                          {it.primaryLabel}
                        </p>
                        {it.secondaryLabel && (
                          <p className="text-xs text-m3-on-surface-variant truncate font-mono">
                            {it.secondaryLabel}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-m3-primary shrink-0">
                        {alreadyAddedLabel}
                      </span>
                    </div>
                  </li>
                ))}
              {/* Selectable rows. */}
              {selectableItems.map((it) => {
                const checked = picked.has(it.id);
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => toggle(it)}
                      aria-pressed={checked}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer",
                        checked
                          ? "bg-m3-primary-fixed/40"
                          : "hover:bg-m3-surface-container-low",
                      )}
                    >
                      {/* Presentational only: the row <button> owns the toggle.
                          A real onChange here would double-fire with the
                          button's onClick and cancel itself out. */}
                      <Checkbox
                        checked={checked}
                        readOnly
                        tabIndex={-1}
                        className="pointer-events-none"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-m3-on-surface truncate">
                          {it.primaryLabel}
                        </p>
                        {it.secondaryLabel && (
                          <p className="text-xs text-m3-on-surface-variant truncate font-mono">
                            {it.secondaryLabel}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 p-5 border-t border-m3-outline-variant/20">
          <span className="text-xs text-m3-on-surface-variant">
            {t("entity_select.selected_count", { count: pickedCount })}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={pickedCount === 0 || isSubmitting}
              className="gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("entity_select.add_selected", { count: pickedCount })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
