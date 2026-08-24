import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import {
  EntityDialogFooter,
  EntityDialogHeader,
} from "./entity-multi-select-dialog/chrome";
import { EntityList } from "./entity-multi-select-dialog/list";
import type { SelectableEntity } from "./entity-multi-select-dialog/types";

export type { SelectableEntity } from "./entity-multi-select-dialog/types";

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
    () =>
      items.filter(
        (it) => !alreadySelectedIds.has(it.id) && it.selectable !== false,
      ),
    [items, alreadySelectedIds],
  );

  function toggle(item: T) {
    if (item.selectable === false) return; // defensive; rows render disabled
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
        <EntityDialogHeader
          title={title}
          onClose={onClose}
          isSubmitting={isSubmitting}
          cancelLabel={t("common.cancel")}
        />

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
          <EntityList<T>
            isLoading={isLoading}
            items={items}
            selectableItems={selectableItems}
            alreadySelectedIds={alreadySelectedIds}
            picked={picked}
            onToggle={toggle}
            emptyText={emptyText}
            alreadyAddedLabel={alreadyAddedLabel}
          />
        </div>

        <EntityDialogFooter
          pickedCount={pickedCount}
          isSubmitting={isSubmitting}
          onClose={onClose}
          onConfirm={handleConfirm}
          countLabel={t("entity_select.selected_count", { count: pickedCount })}
          cancelLabel={t("common.cancel")}
          addLabel={t("entity_select.add_selected", { count: pickedCount })}
        />
      </div>
    </div>
  );
}
