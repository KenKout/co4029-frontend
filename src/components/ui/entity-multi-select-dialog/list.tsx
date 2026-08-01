import { AttachedEntityRow, SelectableEntityRow } from "./rows";
import type { SelectableEntity } from "./types";

export interface EntityListProps<T extends SelectableEntity> {
  isLoading: boolean;
  items: T[];
  selectableItems: T[];
  alreadySelectedIds: Set<string>;
  picked: Map<string, T>;
  onToggle: (item: T) => void;
  emptyText: string;
  alreadyAddedLabel: string;
}

export function EntityList<T extends SelectableEntity>({
  isLoading,
  items,
  selectableItems,
  alreadySelectedIds,
  picked,
  onToggle,
  emptyText,
  alreadyAddedLabel,
}: EntityListProps<T>) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-12 bg-m3-surface-container animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-m3-on-surface-variant">
        {emptyText}
      </p>
    );
  }

  return (
    <ul className="py-1">
      {/* Already-attached rows: checked + disabled, shown first. */}
      {items
        .filter((it) => alreadySelectedIds.has(it.id))
        .map((it) => (
          <li key={it.id}>
            <AttachedEntityRow
              item={it}
              alreadyAddedLabel={alreadyAddedLabel}
            />
          </li>
        ))}
      {/* Selectable rows. */}
      {selectableItems.map((it) => (
        <li key={it.id}>
          <SelectableEntityRow<T>
            item={it}
            checked={picked.has(it.id)}
            onToggle={onToggle}
          />
        </li>
      ))}
    </ul>
  );
}
