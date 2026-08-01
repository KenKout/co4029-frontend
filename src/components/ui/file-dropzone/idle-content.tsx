import { CloudUpload } from "lucide-react";
import { cn } from "@/lib/utils";

export function DropzoneIdleContent({
  compact,
  title,
  hint,
}: {
  compact?: boolean;
  title: string;
  hint?: string;
}) {
  return (
    <div className="pointer-events-none">
      <div
        className={cn(
          "flex items-center justify-center",
          compact ? "gap-3" : "gap-3 mb-4",
        )}
      >
        <div
          className={cn(
            "rounded-xl gradient-primary flex items-center justify-center shadow-ai-glow",
            compact ? "w-10 h-10" : "w-14 h-14",
          )}
        >
          <CloudUpload
            className={cn("text-white", compact ? "h-5 w-5" : "h-7 w-7")}
          />
        </div>
        {compact && (
          <div className="text-left">
            <p className="font-headline font-bold text-m3-on-surface text-sm">
              {title}
            </p>
            {hint && (
              <p className="text-xs text-m3-on-surface-variant">{hint}</p>
            )}
          </div>
        )}
      </div>
      {!compact && (
        <>
          <p className="font-headline font-bold text-m3-on-surface text-base mb-1">
            {title}
          </p>
          {hint && <p className="text-sm text-m3-on-surface-variant">{hint}</p>}
        </>
      )}
    </div>
  );
}
