import type { FileKind } from "@/lib/file-icons";
import { cn } from "@/lib/utils";

export function DropzoneDragContent({
  compact,
  kind,
  dragMime,
  dropLabel,
}: {
  compact?: boolean;
  kind: FileKind;
  dragMime: string | null;
  dropLabel: string;
}) {
  const KindIcon = kind.Icon;
  return (
    <div
      className={cn(
        "pointer-events-none flex items-center justify-center",
        compact ? "gap-3" : "flex-col gap-3",
      )}
    >
      <div className="w-14 h-14 rounded-xl bg-m3-surface flex items-center justify-center shadow-ai-glow ai-pulse">
        <KindIcon className={cn("h-7 w-7", kind.colorClass)} />
      </div>
      <div className={compact ? "text-left" : ""}>
        <p className="font-headline font-bold text-m3-on-surface text-base">
          {dropLabel}
        </p>
        {dragMime && kind.label !== "File" && (
          <p className="text-xs text-m3-on-surface-variant mt-0.5">
            {kind.label}
          </p>
        )}
      </div>
    </div>
  );
}
