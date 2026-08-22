import type { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Title + hint on the left, one primary action on the right. Used by the
 * courses tab ("add courses") and the students tab ("register students") —
 * both rendered exactly this card before the split.
 */
export function SectionActionCard({
  title,
  hint,
  icon: Icon,
  actionLabel,
  onAction,
}: {
  title: string;
  hint: string;
  icon: typeof BookOpen;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 p-5">
      <div>
        <h3 className="text-sm font-bold text-m3-on-surface">{title}</h3>
        <p className="text-xs text-m3-on-surface-variant mt-0.5">{hint}</p>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={onAction}
        className="gap-2 shrink-0"
      >
        <Icon className="h-4 w-4" />
        {actionLabel}
      </Button>
    </div>
  );
}
