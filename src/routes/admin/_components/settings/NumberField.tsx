import { useState } from "react";
import type { RuntimeSetting } from "@/lib/api/hooks/admin-settings";
import { cn } from "@/lib/utils";
import { unitFor } from "./helpers";

export function NumberField({
  setting,
  value,
  onCommit,
  disabled,
}: {
  setting: RuntimeSetting;
  value: string;
  onCommit: (v: string) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const unit = unitFor(setting);
  const shown = draft !== null ? draft : value;

  return (
    <div className="w-full">
      <div className="relative">
        <input
          type="number"
          className={cn(
            "w-full rounded-md border border-slate-300 py-1.5 pl-2.5 text-sm tabular-nums",
            "focus:border-m3-primary focus:outline-none focus:ring-1 focus:ring-m3-primary/40",
            unit ? "pr-10" : "pr-2.5",
          )}
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
        {unit && (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {unit}
          </span>
        )}
      </div>
      {setting.minimum !== null && setting.maximum !== null && (
        <p className="mt-1 text-[11px] text-slate-400">
          {setting.minimum}–{setting.maximum}
          {unit ? ` ${unit}` : ""}
        </p>
      )}
    </div>
  );
}
