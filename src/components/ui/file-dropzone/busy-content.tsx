import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function DropzoneBusyContent({
  compact,
  label,
}: {
  compact?: boolean;
  label: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none flex items-center justify-center",
        compact ? "gap-3" : "flex-col gap-3",
      )}
    >
      <Loader2
        className={cn(
          "animate-spin text-m3-secondary",
          compact ? "h-5 w-5" : "h-8 w-8",
        )}
      />
      <p className="font-headline font-bold text-m3-on-surface text-base">
        {label}
      </p>
    </div>
  );
}
