import type { Users } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * One summary tile of the Progress header strip. Moved verbatim out of the
 * former 401-line course-progress.tsx, where it was a file-local component
 * below the page.
 */
export function SummaryTile({
  icon: Icon,
  label,
  value,
  loading,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  loading?: boolean;
  tone?: "emerald" | "default";
}) {
  return (
    <div className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial p-4 flex items-start gap-3">
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          tone === "emerald" ? "bg-emerald-50" : "bg-m3-primary-fixed",
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5",
            tone === "emerald" ? "text-emerald-600" : "text-m3-primary",
          )}
        />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant truncate">
          {label}
        </p>
        <p className="text-2xl font-headline font-black text-m3-primary mt-0.5 tabular-nums">
          {loading ? "—" : value}
        </p>
      </div>
    </div>
  );
}
