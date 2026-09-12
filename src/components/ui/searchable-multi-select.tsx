import { useRef, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Check, X } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";

export interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/** Search, keyboard selection and chips use the same Base UI primitives as Select. */
export function SearchableMultiSelect({ options, value, onValueChange, label, placeholder, emptyText, removeLabel, disabled = false }: {
  options: MultiSelectOption[];
  value: string[];
  onValueChange: (next: string[]) => void;
  label: string;
  placeholder: string;
  emptyText: string;
  removeLabel: (label: string) => string;
  disabled?: boolean;
}) {
  const anchor = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const text = (id: string) => options.find((option) => option.value === id)?.label ?? "";
  return (
    <Combobox.Root multiple modal={false} items={options.map((option) => option.value)} value={value}
      itemToStringLabel={text} disabled={disabled} inputValue={search} onInputValueChange={setSearch}
      onValueChange={(next, details) => {
        // Escape dismisses search; never silently discard the selected batch.
        if (disabled || details.reason === "escape-key") { details.cancel(); return; }
        onValueChange(next);
        setSearch("");
      }}>
      <Combobox.Chips ref={anchor} className="flex min-h-10 w-full min-w-0 flex-wrap items-center gap-2 rounded-xl border border-border bg-m3-surface p-2 focus-within:border-m3-primary">
        {value.map((id) => <Combobox.Chip key={id} className="flex max-w-full min-w-0 items-center gap-1 rounded-lg bg-m3-primary/10 px-2 py-1 text-sm">
          <span className="min-w-0 break-words">{text(id)}</span>
          <Combobox.ChipRemove render={<Button type="button" variant="ghost" size="icon" />} disabled={disabled}
            aria-label={removeLabel(text(id))} className="h-6 w-6 shrink-0 p-0"><X className="h-3 w-3" /></Combobox.ChipRemove>
        </Combobox.Chip>)}
        <Combobox.Input render={<Input />} disabled={disabled} aria-label={label} placeholder={placeholder}
          className="h-8 min-w-0 flex-1 basis-40 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0" />
      </Combobox.Chips>
      <Combobox.Portal>
        <Combobox.Positioner anchor={anchor} sideOffset={6} className="z-50">
          <Combobox.Popup className="max-h-72 w-[var(--anchor-width)] overflow-auto rounded-xl border border-border bg-m3-surface p-1 shadow-xl">
            <Combobox.Empty className="px-3 py-2 text-sm text-m3-on-surface-variant">{emptyText}</Combobox.Empty>
            <Combobox.List>
              {(id: string) => <Combobox.Item key={id} value={id} disabled={options.find((option) => option.value === id)?.disabled}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm data-[highlighted]:bg-m3-primary/10 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50">
                <Combobox.ItemIndicator className="shrink-0"><Check className="h-4 w-4" /></Combobox.ItemIndicator>
                <span className="min-w-0 break-words">{text(id)}</span>
              </Combobox.Item>}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
