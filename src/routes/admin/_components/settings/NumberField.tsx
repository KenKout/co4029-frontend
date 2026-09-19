import { useState } from "react";
import type { RuntimeSetting } from "@/lib/api/hooks/admin-settings";
import { unitFor } from "./helpers";
import { Input } from "@/components/ui/input";

export function NumberField({
  setting,
  value,
  onCommit,
  disabled,
}: {
  setting: RuntimeSetting;
  value: string;
  onCommit: (v: string) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const unit = unitFor(setting);
  const shown = draft !== null ? draft : value;

  return (
    <div className="w-full">
      <Input
        type="number"
        endAdornment={unit || undefined}
        value={shown}
        step={setting.type === "float" ? "0.01" : "1"}
        min={setting.minimum ?? undefined}
        max={setting.maximum ?? undefined}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== null) {
            onCommit(draft);
            setDraft(null);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft !== null) {
            onCommit(draft);
            setDraft(null);
          }
          if (e.key === "Escape") setDraft(null);
        }}
      />
      {setting.minimum !== null && setting.maximum !== null && (
        <p className="mt-1 text-[11px] text-slate-400">
          {setting.minimum}–{setting.maximum}
          {unit ? ` ${unit}` : ""}
        </p>
      )}
    </div>
  );
}
