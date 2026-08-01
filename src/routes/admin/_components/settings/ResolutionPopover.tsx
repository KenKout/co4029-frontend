import { Popover } from "@base-ui/react/popover";
import type { RuntimeSetting } from "@/lib/api/hooks/admin-settings";
import { resolutionLayers } from "./helpers";
import { ResolutionLayerRow } from "./ResolutionLayerRow";
import { SourceBadge } from "./SourceBadge";

/** The resolution chain popover: org → global → env → built-in, winner lit. */
export function ResolutionPopover({ setting }: { setting: RuntimeSetting }) {
  const layers = resolutionLayers(setting);

  return (
    <Popover.Root>
      <Popover.Trigger
        className="cursor-pointer rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/40"
        aria-label="Show where this value comes from"
      >
        <SourceBadge source={setting.source} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="end">
          <Popover.Popup className="z-50 w-72 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-lg outline-none">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Resolution order
            </p>
            <ol className="space-y-1">
              {layers.map((layer) => (
                <ResolutionLayerRow
                  key={layer.source}
                  layer={layer}
                  isWinner={layer.source === setting.source}
                />
              ))}
            </ol>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
