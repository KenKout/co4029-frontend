import { CircleDot, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TranslateFn } from "./types";

/**
 * Trailing status cell of a curriculum row: a static badge once the item is
 * published, otherwise the inline publish control. Moved verbatim out of
 * `ModuleItemRow`; the caller still owns the `{status && …}` guard so an item
 * with no status renders nothing at all, exactly as before.
 */
export function ModuleItemStatusBadge({
  status,
  publishing,
  onPublish,
  t,
}: {
  status: string;
  publishing: boolean;
  onPublish: (e: React.MouseEvent) => void;
  t: TranslateFn;
}) {
  return status === "published" ? (
    <Badge className="text-[10px] border-0 shrink-0 bg-emerald-100 text-emerald-700">
      {status}
    </Badge>
  ) : (
    // Inline publish (T#2): a draft/archived item can be published right
    // here without opening it. Stops propagation so it doesn't trigger
    // the row's drag / link behaviour.
    <Button variant="ghost"
      type="button"
      onClick={onPublish}
      disabled={publishing}
      title={t("teacher_common.publish_item")}
      className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 hover:bg-emerald-100 hover:text-emerald-700 transition-colors cursor-pointer disabled:opacity-50 h-auto whitespace-normal"
    >
      {publishing ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      ) : (
        <CircleDot className="h-2.5 w-2.5" />
      )}
      {t("teacher_common.publish_item")}
    </Button>
  );
}
