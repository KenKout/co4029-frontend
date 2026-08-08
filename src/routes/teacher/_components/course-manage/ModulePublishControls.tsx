import { CheckCheck, CircleDot, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ModuleItemStats, TranslateFn } from "./types";

/**
 * Publish progress chip (T#1 + #2) and the publish-all action (T#2) in the
 * module header. The chip fills the wasted middle space with useful signal —
 * how many items are live, green when all published; the action is only shown
 * when there's at least one draft to publish. Moved verbatim out of
 * `ModuleAccordion`.
 */
export function ModulePublishControls({
  stats,
  publishingAll,
  onPublishAll,
  t,
}: {
  stats: ModuleItemStats;
  publishingAll: boolean;
  onPublishAll: (e: React.MouseEvent) => void;
  t: TranslateFn;
}) {
  const { statusedItems, publishedCount, draftItems, allPublished } = stats;

  return (
    <>
      {statusedItems.length > 0 && (
        <span
          className={cn(
            "hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
            allPublished
              ? "bg-emerald-100 text-emerald-700"
              : "bg-m3-surface-container-high text-m3-on-surface-variant",
          )}
          title={t("teacher_common.publish_progress", {
            published: publishedCount,
            total: statusedItems.length,
          })}
        >
          {allPublished ? (
            <CheckCheck className="h-2.5 w-2.5" />
          ) : (
            <CircleDot className="h-2.5 w-2.5" />
          )}
          {publishedCount}/{statusedItems.length}
        </span>
      )}

      {draftItems.length > 0 && (
        <Button variant="ghost"
          type="button"
          onClick={onPublishAll}
          disabled={publishingAll}
          title={t("teacher_common.publish_all", {
            count: draftItems.length,
          })}
          className="shrink-0 hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 hover:bg-emerald-100 hover:text-emerald-700 transition-colors cursor-pointer disabled:opacity-50 h-auto whitespace-normal"
        >
          {publishingAll ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
          ) : (
            <CheckCheck className="h-2.5 w-2.5" />
          )}
          {t("teacher_common.publish_all", { count: draftItems.length })}
        </Button>
      )}
    </>
  );
}
