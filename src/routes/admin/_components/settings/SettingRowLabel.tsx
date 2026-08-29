import { ChevronDown } from "lucide-react";
import type { RuntimeSetting } from "@/lib/api/hooks/admin-settings";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfigKeyReveal } from "./ConfigKeyReveal";
import { ResolutionPopover } from "./ResolutionPopover";
import type { SettingRowController } from "./use-setting-row";

/** Left column of a card-view row: label, resolution badge, description. */
export function SettingRowLabel({
  controller,
  setting,
  showKeys,
  lead,
  rest,
}: {
  controller: SettingRowController;
  setting: RuntimeSetting;
  showKeys: boolean;
  lead: string;
  rest: string;
}) {
  const { expanded, setExpanded, label } = controller;

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        {setting.requires_reprocess && (
          <span
            title="Applies on next ingest"
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
          />
        )}
        <span className="font-medium text-slate-900">{label}</span>
        <ResolutionPopover setting={setting} />
        {rest && (
          <Button
            variant="ghost"
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 h-auto whitespace-normal"
            aria-label={expanded ? "Hide details" : "Show details"}
            aria-expanded={expanded}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                expanded && "rotate-180",
              )}
            />
          </Button>
        )}
        <ConfigKeyReveal setting={setting} forceShow={showKeys} />
      </div>
      <p className="mt-1 max-w-[60ch] text-sm text-slate-600">{lead}</p>
      {expanded && rest && (
        <p className="mt-1 max-w-[60ch] text-sm text-slate-500">{rest}</p>
      )}
    </div>
  );
}
