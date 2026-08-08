import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/ui/status-badge";
import { COURSE_STATUS_TOKENS } from "@/lib/status-tokens";
import { cn } from "@/lib/utils";
import type { SelectableEntity } from "./types";

function EntityRowLabels({ item }: { item: SelectableEntity }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-m3-on-surface truncate">
        {item.primaryLabel}
      </p>
      {item.secondaryLabel && (
        <p className="text-xs text-m3-on-surface-variant truncate font-mono">
          {item.secondaryLabel}
        </p>
      )}
    </div>
  );
}

/** Status chip, when the row carries one (e.g. course draft/published). */
function EntityRowStatus({ item }: { item: SelectableEntity }) {
  if (!item.status) return null;
  return (
    <StatusBadge
      status={item.status}
      tokens={COURSE_STATUS_TOKENS}
      label={item.status}
      size="sm"
      className="shrink-0"
    />
  );
}

export function AttachedEntityRow({
  item,
  alreadyAddedLabel,
}: {
  item: SelectableEntity;
  alreadyAddedLabel: string;
}) {
  return (
    <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg opacity-60">
      <Checkbox checked disabled />
      <EntityRowLabels item={item} />
      <EntityRowStatus item={item} />
      <span className="text-[10px] font-bold uppercase tracking-wider text-m3-primary shrink-0">
        {alreadyAddedLabel}
      </span>
    </div>
  );
}

export function SelectableEntityRow<T extends SelectableEntity>({
  item,
  checked,
  onToggle,
}: {
  item: T;
  checked: boolean;
  onToggle: (item: T) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(item)}
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
      <EntityRowLabels item={item} />
      <EntityRowStatus item={item} />
    </button>
  );
}
